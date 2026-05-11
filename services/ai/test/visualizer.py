from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np


def _prediction_arrays(predictions: list[dict[str, Any]]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    y_true = np.asarray([int(row["y_true"]) for row in predictions], dtype=int)
    y_pred = np.asarray([int(row["pred"]) for row in predictions], dtype=int)
    y_score = np.asarray([float(row["p_macro"]) for row in predictions], dtype=float)
    return y_true, y_pred, y_score


def _style_axes(ax: Any) -> None:
    ax.grid(True, alpha=0.25, linewidth=0.8)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)


def save_evaluation_plots(
    predictions: list[dict[str, Any]],
    metrics: dict[str, Any],
    output_dir: str | Path,
    threshold: float,
) -> dict[str, str]:
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        from sklearn.metrics import ConfusionMatrixDisplay, PrecisionRecallDisplay, RocCurveDisplay
    except Exception as exc:  # pragma: no cover
        raise RuntimeError("Missing visualization dependencies: matplotlib and scikit-learn are required.") from exc

    output_dir = Path(output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    y_true, y_pred, y_score = _prediction_arrays(predictions)
    display_labels = ["human", "macro"]
    has_two_classes = len(set(y_true.tolist())) == 2

    summary_path = output_dir / "evaluation_summary.png"
    score_path = output_dir / "score_distribution.png"
    cm_path = output_dir / "confusion_matrix.png"

    fig, axes = plt.subplots(2, 2, figsize=(13, 9))
    fig.suptitle("Offline Model Performance", fontsize=16, fontweight="bold")

    cm = np.asarray(metrics["confusion_matrix"], dtype=int)
    ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=display_labels).plot(
        ax=axes[0, 0],
        cmap="Blues",
        colorbar=False,
        values_format="d",
    )
    axes[0, 0].set_title("Confusion Matrix")

    if has_two_classes:
        RocCurveDisplay.from_predictions(y_true, y_score, ax=axes[0, 1], name="model")
        axes[0, 1].set_title(f"ROC Curve (AUC={metrics.get('roc_auc'):.4f})")
        _style_axes(axes[0, 1])

        PrecisionRecallDisplay.from_predictions(y_true, y_score, ax=axes[1, 0], name="model")
        axes[1, 0].set_title(f"Precision-Recall (AP={metrics.get('average_precision'):.4f})")
        _style_axes(axes[1, 0])
    else:
        for ax, title in ((axes[0, 1], "ROC Curve"), (axes[1, 0], "Precision-Recall")):
            ax.text(0.5, 0.5, "Need both classes", ha="center", va="center", fontsize=12)
            ax.set_title(title)
            ax.set_xticks([])
            ax.set_yticks([])

    _plot_score_distribution(axes[1, 1], y_true, y_score, threshold)
    axes[1, 1].set_title("P(macro) Distribution")

    metric_text = (
        f"n={metrics.get('sample_count')}  "
        f"acc={metrics.get('accuracy'):.4f}  "
        f"precision={metrics.get('precision'):.4f}  "
        f"recall={metrics.get('recall'):.4f}  "
        f"f1={metrics.get('f1'):.4f}"
    )
    fig.text(0.5, 0.02, metric_text, ha="center", fontsize=11)
    fig.tight_layout(rect=(0, 0.04, 1, 0.95))
    fig.savefig(summary_path, dpi=160)
    plt.close(fig)

    fig_cm, ax_cm = plt.subplots(figsize=(5, 4))
    ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=display_labels).plot(
        ax=ax_cm,
        cmap="Blues",
        colorbar=False,
        values_format="d",
    )
    ax_cm.set_title("Confusion Matrix")
    fig_cm.tight_layout()
    fig_cm.savefig(cm_path, dpi=160)
    plt.close(fig_cm)

    fig_score, ax_score = plt.subplots(figsize=(8, 4.8))
    _plot_score_distribution(ax_score, y_true, y_score, threshold)
    ax_score.set_title("P(macro) Distribution")
    fig_score.tight_layout()
    fig_score.savefig(score_path, dpi=160)
    plt.close(fig_score)

    return {
        "summary_png": str(summary_path),
        "confusion_matrix_png": str(cm_path),
        "score_distribution_png": str(score_path),
    }


def _plot_score_distribution(ax: Any, y_true: np.ndarray, y_score: np.ndarray, threshold: float) -> None:
    human_scores = y_score[y_true == 0]
    macro_scores = y_score[y_true == 1]
    bins = np.linspace(0.0, 1.0, 21)

    ax.hist(human_scores, bins=bins, alpha=0.72, label="human", color="#3B82F6", edgecolor="white")
    ax.hist(macro_scores, bins=bins, alpha=0.72, label="macro", color="#EF4444", edgecolor="white")
    ax.axvline(threshold, color="#111827", linestyle="--", linewidth=1.6, label=f"threshold={threshold:.2f}")
    ax.set_xlabel("P(macro)")
    ax.set_ylabel("Trial count")
    ax.set_xlim(0.0, 1.0)
    ax.legend(frameon=False)
    _style_axes(ax)
