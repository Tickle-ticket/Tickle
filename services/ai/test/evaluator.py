from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from trial_loader import TrialSample


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

    # Common project convention:
    # - human == ALLOW
    # - macro == BLOCK
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

    # Be tolerant to case differences in mapping keys.
    lower_map = {str(k).strip().lower(): int(v) for k, v in label_mapping.items()}
    key = label_str.strip().lower()
    if key in lower_map:
        return int(lower_map[key])

    return None


def predict_macro_scores(model: object, x: Any) -> np.ndarray:
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


def evaluate_binary_classifier(
    model: object,
    x: Any,
    samples: list[TrialSample],
    label_mapping: dict[str, int],
    threshold: float = 0.5,
) -> EvaluationResult:
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

    labeled = [
        (idx, sample)
        for idx, sample in enumerate(samples)
        if _map_label_to_int(sample.label, label_mapping) is not None
    ]
    if not labeled:
        raise RuntimeError(f"No samples have labels included in label_mapping={label_mapping}.")

    scores_all = predict_macro_scores(model, x)
    indices = [idx for idx, _sample in labeled]
    y_score = scores_all[indices]
    y_pred = (y_score >= threshold).astype(int)
    y_true_list = [_map_label_to_int(sample.label, label_mapping) for _idx, sample in labeled]
    if any(v is None for v in y_true_list):
        raise RuntimeError("Internal error: y_true contained unmapped labels after filtering.")
    y_true = np.asarray([int(v) for v in y_true_list], dtype=int)

    metrics: dict[str, Any] = {
        "sample_count": int(len(labeled)),
        "threshold": float(threshold),
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
    for row_idx, (sample_idx, sample) in enumerate(labeled):
        pred = int(y_pred[row_idx])
        true = int(y_true[row_idx])

        nan_count: int | None = None
        nan_ratio: float | None = None
        try:
            if hasattr(x, "iloc"):
                # pandas.DataFrame
                row = x.iloc[int(sample_idx)]
                nan_count = int(row.isna().sum())
                total = int(row.shape[0])
                nan_ratio = float(nan_count / total) if total > 0 else None
            else:
                # numpy-like
                import numpy as _np

                row_arr = _np.asarray(x[int(sample_idx)])
                nan_count = int(_np.isnan(row_arr).sum())
                total = int(row_arr.size)
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
                "nan_count": nan_count,
                "nan_ratio": nan_ratio,
                "file": str(sample.path),
                "sample_index": int(sample_idx),
            }
        )

    return EvaluationResult(metrics=metrics, predictions=predictions)
