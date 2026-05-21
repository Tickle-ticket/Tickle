from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from trial_loader import TrialSample


def predict_macro_scores(model: object, x: Any) -> np.ndarray:
    """Return P(macro) for each sample. Compatible with sklearn/lightgbm models."""
    if hasattr(model, "predict_proba"):
        probs = np.asarray(model.predict_proba(x), dtype=np.float64)  # type: ignore[attr-defined]
        if probs.ndim != 2 or probs.shape[1] < 2:
            raise ValueError(f"Unexpected predict_proba shape: {probs.shape}")
        return probs[:, 1]

    if hasattr(model, "decision_function"):
        scores = np.asarray(model.decision_function(x), dtype=np.float64)  # type: ignore[attr-defined]
        return 1.0 / (1.0 + np.exp(-scores))

    preds = np.asarray(model.predict(x), dtype=np.float64)  # type: ignore[attr-defined]
    return preds


@dataclass(frozen=True)
class EvaluationResult:
    metrics: dict[str, Any]
    predictions: list[dict[str, Any]]


def _map_label_to_int(label: str | None, label_mapping: dict[str, int]) -> int | None:
    if label is None:
        return None

    label_str = str(label)
    if label_str in label_mapping:
        return int(label_mapping[label_str])

    upper = label_str.strip().upper()
    if upper == "ALLOW":
        if "human" in label_mapping:
            return int(label_mapping["human"])
        if "HUMAN" in label_mapping:
            return int(label_mapping["HUMAN"])
    if upper == "BLOCK":
        if "macro" in label_mapping:
            return int(label_mapping["macro"])
        if "MACRO" in label_mapping:
            return int(label_mapping["MACRO"])

    lower_map = {str(k).strip().lower(): int(v) for k, v in label_mapping.items()}
    key = label_str.strip().lower()
    if key in lower_map:
        return int(lower_map[key])
    return None


def _aggregate(scores: list[np.ndarray], weights: list[float], aggregation: str) -> np.ndarray:
    if not scores:
        raise ValueError("No score arrays provided.")
    aggregation = str(aggregation).strip().lower()
    arr = np.vstack(scores)  # (n_models, n_samples)

    if aggregation in {"mean", "avg"}:
        return np.mean(arr, axis=0)
    if aggregation in {"max"}:
        return np.max(arr, axis=0)
    if aggregation in {"min"}:
        return np.min(arr, axis=0)
    if aggregation in {"weighted_mean", "wmean"}:
        w = np.asarray(weights, dtype=np.float64)
        if w.ndim != 1 or w.shape[0] != arr.shape[0]:
            raise ValueError("weights must match number of models")
        if float(np.sum(w)) == 0.0:
            w = np.ones_like(w)
        w = w / np.sum(w)
        return (arr.T @ w).astype(np.float64)

    raise ValueError(f"Unknown aggregation: {aggregation}")


def _hard_vote_pred_and_score(
    score_vecs: list[np.ndarray],
    *,
    vote_threshold: float,
    rule: str,
    k: int | None,
) -> tuple[np.ndarray, np.ndarray]:
    """Hard-voting decision using per-model probabilities.

    Returns:
      y_score: fraction of models voting macro (0..1)
      y_pred:  binary prediction from the voting rule
    """
    if not score_vecs:
        raise ValueError("No score arrays provided.")
    arr = np.vstack(score_vecs)  # (n_models, n_samples)
    votes = arr >= float(vote_threshold)
    vote_counts = np.sum(votes, axis=0).astype(int)
    n_models = int(arr.shape[0])
    y_score = (vote_counts / max(n_models, 1)).astype(np.float64)

    rule_l = str(rule).strip().lower()
    if rule_l in {"all", "unanimous"}:
        y_pred = (vote_counts == n_models).astype(int)
        return y_score, y_pred

    if rule_l in {"majority", "kofn", "k_of_n"}:
        kk = int(k) if k is not None else (n_models // 2 + 1)
        if kk < 1 or kk > n_models:
            raise ValueError(f"Invalid hard voting k={kk} for n_models={n_models}")
        y_pred = (vote_counts >= kk).astype(int)
        return y_score, y_pred

    raise ValueError(f"Unknown hard voting rule: {rule}")


def select_hard_vote_threshold(
    *,
    score_vecs: list[np.ndarray],
    y_true: np.ndarray,
    candidates: list[float],
    rule: str,
    k: int | None,
    max_fp: int,
) -> tuple[float, dict[str, Any]]:
    """Choose vote_threshold that maximizes recall under an FP constraint."""
    best_t: float | None = None
    best_recall = -1.0
    best_stats: dict[str, Any] | None = None

    for t in candidates:
        y_score, y_pred = _hard_vote_pred_and_score(score_vecs, vote_threshold=float(t), rule=rule, k=k)
        # FP count among human (0) predicted macro (1)
        fp = int(np.sum((y_true == 0) & (y_pred == 1)))
        if fp > int(max_fp):
            continue
        tp = int(np.sum((y_true == 1) & (y_pred == 1)))
        fn = int(np.sum((y_true == 1) & (y_pred == 0)))
        recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        if recall > best_recall or best_t is None:
            best_recall = recall
            best_t = float(t)
            best_stats = {"tp": tp, "fn": fn, "fp": fp, "recall": recall}

    if best_t is None or best_stats is None:
        raise RuntimeError("No candidate threshold satisfies the FP constraint.")
    return best_t, best_stats


def evaluate_type_ensemble(
    *,
    type_name: str,
    artifacts: list[tuple[object, list[str], float, str]],
    x_union: Any,
    samples: list[TrialSample],
    label_mapping: dict[str, int],
    threshold: float,
    aggregation: str,
    hard_voting: dict[str, Any] | None = None,
    post_filter: dict[str, Any] | None = None,
) -> EvaluationResult:
    """Evaluate ensemble on only samples where sample.sample_type matches type_name (case-insensitive)."""
    try:
        from sklearn.metrics import (
            accuracy_score,
            average_precision_score,
            classification_report,
            confusion_matrix,
            f1_score,
            log_loss,
            precision_score,
            recall_score,
            roc_auc_score,
        )
    except Exception as exc:  # pragma: no cover
        raise RuntimeError("Missing dependency: scikit-learn is required for performance metrics.") from exc

    type_name_u = str(type_name).strip().upper()
    indices = [
        idx
        for idx, s in enumerate(samples)
        if str(getattr(s, "sample_type", "") or "").strip().upper() == type_name_u
        and _map_label_to_int(s.label, label_mapping) is not None
    ]
    if not indices:
        return EvaluationResult(metrics={"type": type_name, "sample_count": 0, "threshold": threshold}, predictions=[])

    # Precompute per-model scores for all samples once, then subset indices.
    score_vecs: list[np.ndarray] = []
    weights: list[float] = []
    names: list[str] = []
    for model, feature_names, weight, name in artifacts:
        if hasattr(x_union, "loc") and hasattr(x_union, "__getitem__"):
            x_m = x_union[feature_names]
        else:
            # numpy-like: feature selection not supported here
            x_m = x_union
        score_vecs.append(predict_macro_scores(model, x_m))
        weights.append(float(weight))
        names.append(str(name))

    y_true_list = [_map_label_to_int(samples[i].label, label_mapping) for i in indices]
    y_true = np.asarray([int(v) for v in y_true_list if v is not None], dtype=int)

    aggregation_l = str(aggregation).strip().lower()
    hard_voting_used: dict[str, Any] | None = None
    post_filter_used: dict[str, Any] | None = None
    if aggregation_l in {"hard_vote", "hard_voting"} or (hard_voting and hard_voting.get("enabled", False)):
        hv = hard_voting or {}
        rule = str(hv.get("rule", "all"))
        k = hv.get("k", None)
        max_fp = int(hv.get("max_fp", 0))
        threshold_candidates = hv.get("threshold_candidates", None)

        # Build candidate thresholds if not provided
        if threshold_candidates is None:
            t_min = float(hv.get("threshold_min", 0.0))
            t_max = float(hv.get("threshold_max", 1.0))
            t_step = float(hv.get("threshold_step", 0.01))
            if t_step <= 0:
                raise ValueError("hard_voting.threshold_step must be > 0")
            candidates = [float(x) for x in np.arange(t_min, t_max + 1e-12, t_step)]
        else:
            if not isinstance(threshold_candidates, list):
                raise ValueError("hard_voting.threshold_candidates must be a list of floats when provided.")
            candidates = [float(x) for x in threshold_candidates]
            if not candidates:
                raise ValueError("hard_voting.threshold_candidates must be non-empty.")

        # Only evaluate subset indices
        score_vecs_sub = [sv[indices] for sv in score_vecs]
        selected_t, selected_stats = select_hard_vote_threshold(
            score_vecs=score_vecs_sub,
            y_true=y_true,
            candidates=candidates,
            rule=rule,
            k=int(k) if k is not None else None,
            max_fp=max_fp,
        )
        y_score, y_pred = _hard_vote_pred_and_score(
            score_vecs_sub,
            vote_threshold=selected_t,
            rule=rule,
            k=int(k) if k is not None else None,
        )
        hard_voting_used = {
            "enabled": True,
            "rule": rule,
            "k": int(k) if k is not None else None,
            "max_fp": max_fp,
            "selected_vote_threshold": float(selected_t),
            "selected_stats": selected_stats,
            "n_candidates": int(len(candidates)),
        }
        # For reporting, set displayed threshold to the vote threshold.
        threshold = float(selected_t)
        aggregation = "hard_vote"
    else:
        y_score_all = _aggregate(score_vecs, weights, aggregation=aggregation)
        y_score = y_score_all[indices]
        y_pred = (y_score >= float(threshold)).astype(int)

    # Keep a copy of stage-1 score (before any post_filter overrides) for inspection.
    y_score_stage1 = np.asarray(y_score, dtype=np.float64).copy()

    # Optional post-filter (2-stage decision) for review band.
    # Intended for BOOKING: use a human-only anomaly detector (IsolationForest) on borderline p_macro.
    if post_filter and bool(post_filter.get("enabled", False)):
        kind = str(post_filter.get("kind", "")).strip().lower()
        if kind != "isoforest":
            raise ValueError(f"Unsupported post_filter.kind: {post_filter.get('kind')}")

        iso_model = post_filter.get("model")
        iso_features = post_filter.get("feature_names")
        iso_thr = post_filter.get("decision_function_threshold")
        review_low = post_filter.get("review_low")
        review_high = post_filter.get("review_high")
        if iso_model is None or not isinstance(iso_features, list) or iso_thr is None:
            raise ValueError("post_filter isoforest requires model, feature_names, decision_function_threshold.")
        if review_low is None or review_high is None:
            raise ValueError("post_filter requires review_low and review_high.")

        review_low_f = float(review_low)
        review_high_f = float(review_high)
        if not (0.0 <= review_low_f < review_high_f <= 1.0):
            raise ValueError("post_filter review band must satisfy 0 <= review_low < review_high <= 1.")

        review_mask = (y_score_stage1 > review_low_f) & (y_score_stage1 < review_high_f)
        n_review = int(np.sum(review_mask))

        post_filter_used = {
            "enabled": True,
            "kind": "isoforest",
            "review_band": {"low": review_low_f, "high": review_high_f},
            "review_count": n_review,
            "decision_function_threshold": float(iso_thr),
        }

        if n_review > 0:
            # Map from "type-local indices" back to the original sample indices for feature extraction.
            review_positions = np.where(review_mask)[0].tolist()
            review_sample_indices = [int(indices[pos]) for pos in review_positions]

            # Build isoforest feature matrix.
            if hasattr(x_union, "iloc") and hasattr(x_union, "__getitem__"):
                x_iso = x_union[iso_features].iloc[review_sample_indices]
            else:
                x_iso = x_union

            try:
                iso_scores = np.asarray(iso_model.decision_function(x_iso), dtype=np.float64)  # type: ignore[attr-defined]
            except Exception as exc:
                raise RuntimeError("post_filter isoforest model must support decision_function(X).") from exc
            iso_pred = (iso_scores < float(iso_thr)).astype(int)  # 1=anomaly -> macro

            y_pred = np.asarray(y_pred, dtype=int).copy()
            y_score = np.asarray(y_score_stage1, dtype=np.float64).copy()
            for j, pos in enumerate(review_positions):
                y_pred[int(pos)] = int(iso_pred[j])
                # For plotting/threshold logic, collapse review-band score into hard 0/1 from stage-2.
                y_score[int(pos)] = float(iso_pred[j])
        else:
            # No review samples: final score equals stage-1 score.
            y_score = y_score_stage1
    else:
        y_score = y_score_stage1

    metrics: dict[str, Any] = {
        "type": type_name,
        "sample_count": int(len(indices)),
        "threshold": float(threshold),
        "aggregation": aggregation,
        "models": names,
        "weights": [float(w) for w in weights],
        "hard_voting": hard_voting_used,
        "post_filter": post_filter_used,
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=[0, 1]).tolist(),
        "classification_report": classification_report(
            y_true,
            y_pred,
            labels=[0, 1],
            target_names=["human", "macro"],
            zero_division=0,
            output_dict=True,
        ),
    }

    if len(set(y_true.tolist())) == 2:
        metrics["roc_auc"] = float(roc_auc_score(y_true, y_score))
        metrics["average_precision"] = float(average_precision_score(y_true, y_score))
    else:
        metrics["roc_auc"] = None
        metrics["average_precision"] = None

    clipped_score = np.clip(y_score, 1e-15, 1.0 - 1e-15)
    try:
        metrics["log_loss"] = float(log_loss(y_true, clipped_score, labels=[0, 1]))
    except ValueError:
        metrics["log_loss"] = None

    predictions: list[dict[str, Any]] = []
    for row_idx, sample_idx in enumerate(indices):
        sample = samples[int(sample_idx)]
        pred = int(y_pred[row_idx])
        true = int(y_true[row_idx])

        # nan stats for that sample within the union feature matrix
        nan_count: int | None = None
        nan_ratio: float | None = None
        try:
            if hasattr(x_union, "iloc"):
                row = x_union.iloc[int(sample_idx)]
                nan_count = int(row.isna().sum())
                total = int(row.shape[0])
                nan_ratio = float(nan_count / total) if total > 0 else None
        except Exception:
            nan_count = None
            nan_ratio = None

        predictions.append(
            {
                "trial_id": sample.trial_id,
                "record_id": getattr(sample, "record_id", None),
                "type": getattr(sample, "sample_type", None),
                "label": sample.label,
                "y_true": true,
                "p_macro_stage1": float(y_score_stage1[row_idx]),
                "p_macro": float(y_score[row_idx]),
                "pred": pred,
                "pred_label": "macro" if pred == 1 else "human",
                "is_correct": bool(pred == true),
                "threshold": float(threshold),
                "aggregation": aggregation,
                "ensemble_models": names,
                "ensemble_weights": [float(w) for w in weights],
                "ensemble_model_p_macro": [float(sv[int(sample_idx)]) for sv in score_vecs],
                "post_filter": post_filter_used,
                "nan_count": nan_count,
                "nan_ratio": nan_ratio,
                "file": str(sample.path),
                "sample_index": int(sample_idx),
            }
        )

    return EvaluationResult(metrics=metrics, predictions=predictions)
