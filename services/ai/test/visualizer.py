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
    *,
    missing_heavy_threshold: float = 0.2,
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
    score_type_path = output_dir / "score_by_type.png"
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

    if any(row.get("type") for row in predictions):
        _plot_score_by_type(axes[1, 1], predictions, threshold, missing_heavy_threshold=missing_heavy_threshold)
        axes[1, 1].set_title("P(macro) by Type")
    else:
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

    if any(row.get("type") for row in predictions):
        fig_type, ax_type = plt.subplots(figsize=(8, 4.8))
        _plot_score_by_type(ax_type, predictions, threshold, missing_heavy_threshold=missing_heavy_threshold)
        ax_type.set_title("P(macro) by Type")
        fig_type.tight_layout()
        # Legend is placed outside axes; ensure it is included in the saved image.
        fig_type.savefig(score_type_path, dpi=160, bbox_inches="tight")
        plt.close(fig_type)

    result = {
        "summary_png": str(summary_path),
        "confusion_matrix_png": str(cm_path),
        "score_distribution_png": str(score_path),
    }
    if score_type_path.exists():
        result["score_by_type_png"] = str(score_type_path)
    return result


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
    # Keep legend out of dense histogram area
    ax.legend(frameon=False, loc="upper left")
    _style_axes(ax)


def _plot_score_by_type(
    ax: Any,
    predictions: list[dict[str, Any]],
    threshold: float,
    *,
    missing_heavy_threshold: float,
) -> None:
    # Type colors
    palette = {
        "DETAIL": "#3B82F6",
        "CAPTCHA": "#F59E0B",
        "BOOKING": "#10B981",
        "OTHER": "#6B7280",
    }

    # Make macro points visually distinct regardless of type color
    macro_color = "#EF4444"  # red
    missing_heavy_color = "#8B5CF6"  # purple
    missing_heavy_threshold = float(missing_heavy_threshold)

    types = [str(row.get("type") or "").strip().upper() for row in predictions]
    scores = np.asarray([float(row["p_macro"]) for row in predictions], dtype=float)
    y_true = np.asarray([int(row["y_true"]) for row in predictions], dtype=int)
    nan_ratio = np.asarray(
        [
            float(row.get("nan_ratio")) if row.get("nan_ratio") is not None else 0.0
            for row in predictions
        ],
        dtype=float,
    )
    is_missing_heavy = nan_ratio >= missing_heavy_threshold

    # Keep canonical order for the known stages
    ordered_types = [t for t in ("DETAIL", "CAPTCHA", "BOOKING") if t in set(types)]
    other_types = sorted({t for t in set(types) if t and t not in ordered_types})
    ordered_types.extend(other_types)
    if not ordered_types:
        ordered_types = ["OTHER"]

    # Jittered strip plot: marker encodes true label, color encodes type
    rng = np.random.default_rng(42)
    for i, t in enumerate(ordered_types):
        idx = np.asarray([tt == t for tt in types], dtype=bool)
        if not np.any(idx):
            continue
        y_base = np.full(int(np.sum(idx)), i, dtype=float)
        jitter = rng.normal(0.0, 0.06, size=y_base.shape[0])
        y = y_base + jitter

        color = palette.get(t, palette["OTHER"])
        # human: circle (type color), macro: red X (type-agnostic)
        human_idx = idx & (y_true == 0)
        macro_idx = idx & (y_true == 1)
        if np.any(human_idx):
            # Split by missing-heavy for visibility
            human_clean = human_idx & (~is_missing_heavy)
            human_heavy = human_idx & is_missing_heavy
            if np.any(human_clean):
                ax.scatter(
                    scores[human_clean],
                    (np.full(int(np.sum(human_clean)), i, dtype=float) + rng.normal(0.0, 0.06, size=int(np.sum(human_clean)))),
                    s=18,
                    alpha=0.55,
                    color=color,
                    marker="o",
                    edgecolors="none",
                    label=t,
                )
            if np.any(human_heavy):
                ax.scatter(
                    scores[human_heavy],
                    (np.full(int(np.sum(human_heavy)), i, dtype=float) + rng.normal(0.0, 0.06, size=int(np.sum(human_heavy)))),
                    s=18,
                    alpha=0.7,
                    color=missing_heavy_color,
                    marker="o",
                    edgecolors="none",
                    label="imputed-heavy",
                )
        if np.any(macro_idx):
            macro_clean = macro_idx & (~is_missing_heavy)
            macro_heavy = macro_idx & is_missing_heavy
            if np.any(macro_clean):
                ax.scatter(
                    scores[macro_clean],
                    (np.full(int(np.sum(macro_clean)), i, dtype=float) + rng.normal(0.0, 0.06, size=int(np.sum(macro_clean)))),
                    s=22,
                    alpha=0.65,
                    color=macro_color,
                    marker="x",
                    linewidths=1.2,
                    label="macro",
                )
            if np.any(macro_heavy):
                ax.scatter(
                    scores[macro_heavy],
                    (np.full(int(np.sum(macro_heavy)), i, dtype=float) + rng.normal(0.0, 0.06, size=int(np.sum(macro_heavy)))),
                    s=22,
                    alpha=0.85,
                    color=missing_heavy_color,
                    marker="x",
                    linewidths=1.4,
                    label="imputed-heavy",
                )

    ax.axvline(threshold, color="#111827", linestyle="--", linewidth=1.6, label=f"threshold={threshold:.2f}")
    ax.set_yticks(range(len(ordered_types)))
    ax.set_yticklabels(ordered_types)
    ax.set_xlabel("P(macro)")
    ax.set_xlim(0.0, 1.0)
    ax.set_ylabel("Type")
    _style_axes(ax)
    # De-duplicate legend entries
    handles, labels = ax.get_legend_handles_labels()
    seen = set()
    uniq_h, uniq_l = [], []
    for h, l in zip(handles, labels):
        if l in seen:
            continue
        seen.add(l)
        uniq_h.append(h)
        uniq_l.append(l)

    # Put legend at lower-left to avoid overlapping with data points.
    # (DETAIL/CAPTCHA/BOOKING + macro + imputed-heavy + threshold)
    # Put legend fully outside the plot area.
    ax.legend(
        uniq_h,
        uniq_l,
        frameon=False,
        loc="center left",
        bbox_to_anchor=(1.02, 0.5),
        ncols=1,
        fontsize=9,
        handletextpad=0.5,
        columnspacing=0.8,
        borderaxespad=0.0,
    )
