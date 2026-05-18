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


def evaluate_type_ensemble(
    *,
    type_name: str,
    artifacts: list[tuple[object, list[str], float, str]],
    x_union: Any,
    samples: list[TrialSample],
    label_mapping: dict[str, int],
    threshold: float,
    aggregation: str,
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

    y_score_all = _aggregate(score_vecs, weights, aggregation=aggregation)
    y_score = y_score_all[indices]
    y_pred = (y_score >= float(threshold)).astype(int)
    y_true_list = [_map_label_to_int(samples[i].label, label_mapping) for i in indices]
    y_true = np.asarray([int(v) for v in y_true_list if v is not None], dtype=int)

    metrics: dict[str, Any] = {
        "type": type_name,
        "sample_count": int(len(indices)),
        "threshold": float(threshold),
        "aggregation": aggregation,
        "models": names,
        "weights": [float(w) for w in weights],
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
                "type": getattr(sample, "sample_type", None),
                "label": sample.label,
                "y_true": true,
                "p_macro": float(y_score[row_idx]),
                "pred": pred,
                "pred_label": "macro" if pred == 1 else "human",
                "is_correct": bool(pred == true),
                "threshold": float(threshold),
                "aggregation": aggregation,
                "ensemble_models": names,
                "ensemble_weights": [float(w) for w in weights],
                "nan_count": nan_count,
                "nan_ratio": nan_ratio,
                "file": str(sample.path),
                "sample_index": int(sample_idx),
            }
        )

    return EvaluationResult(metrics=metrics, predictions=predictions)
