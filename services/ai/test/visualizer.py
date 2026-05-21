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
    threshold_by_type: dict[str, float] | None = None,
    minimal_axis_only: bool = False,
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
    score_type_no_macro_below_path = output_dir / "score_by_type.no_macro_below_threshold.png"
    score_type_after_detail_path = output_dir / "score_by_type.after_detail.png"
    score_type_after_captcha_path = output_dir / "score_by_type.after_captcha.png"
    score_type_after_booking_path = output_dir / "score_by_type.after_booking.png"
    score_type_after_detail_min_path = output_dir / "score_by_type.after_detail.minimal_axis_only.png"
    score_type_after_captcha_min_path = output_dir / "score_by_type.after_captcha.minimal_axis_only.png"
    score_type_after_booking_min_path = output_dir / "score_by_type.after_booking.minimal_axis_only.png"
    score_type_stage1_path = output_dir / "score_by_type.stage1_detail_only.png"
    score_type_stage2_path = output_dir / "score_by_type.stage2_detail_captcha.png"
    score_type_stage3_path = output_dir / "score_by_type.stage3_detail_captcha_booking.png"
    score_type_stage1_pass_path = output_dir / "score_by_type.stage1_passed_detail.png"
    score_type_stage2_pass_path = output_dir / "score_by_type.stage2_passed_captcha.png"
    score_type_stage3_pass_path = output_dir / "score_by_type.stage3_passed_booking.png"
    score_type_stage1_min_path = output_dir / "score_by_type.stage1_detail_only.minimal_axis_only.png"
    score_type_stage2_min_path = output_dir / "score_by_type.stage2_detail_captcha.minimal_axis_only.png"
    score_type_stage3_min_path = output_dir / "score_by_type.stage3_detail_captcha_booking.minimal_axis_only.png"
    flow_cm_path = output_dir / "flow_confusion_matrix.png"
    flow_breakdown_path = output_dir / "flow_breakdown.png"
    flow_cm_booking_path = output_dir / "flow_confusion_matrix.booking_stage.png"
    booking_stage_cm_path = output_dir / "booking_stage_confusion_matrix.png"
    score_type_minimal_path = output_dir / "score_by_type.minimal_axis_only.png"
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
        _plot_score_by_type(
            axes[1, 1],
            predictions,
            threshold,
            missing_heavy_threshold=missing_heavy_threshold,
            threshold_by_type=threshold_by_type,
        )
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
        _plot_score_by_type(
            ax_type,
            predictions,
            threshold,
            missing_heavy_threshold=missing_heavy_threshold,
            threshold_by_type=threshold_by_type,
        )
        ax_type.set_title("P(macro) by Type")
        fig_type.tight_layout()
        # Legend is placed outside axes; ensure it is included in the saved image.
        fig_type.savefig(score_type_path, dpi=160, bbox_inches="tight")
        plt.close(fig_type)

        fig_type2, ax_type2 = plt.subplots(figsize=(8, 4.8))
        _plot_score_by_type(
            ax_type2,
            _filter_macro_below_threshold(predictions, threshold, threshold_by_type),
            threshold,
            missing_heavy_threshold=missing_heavy_threshold,
            threshold_by_type=threshold_by_type,
        )
        ax_type2.set_title("P(macro) by Type")
        fig_type2.tight_layout()
        fig_type2.savefig(score_type_no_macro_below_path, dpi=160, bbox_inches="tight")
        plt.close(fig_type2)

        if minimal_axis_only:
            fig_m, ax_m = plt.subplots(figsize=(8, 4.8))
            _plot_score_by_type(
                ax_m,
                predictions,
                threshold,
                missing_heavy_threshold=missing_heavy_threshold,
                threshold_by_type=threshold_by_type,
                show_threshold=False,
            )
            _apply_minimal_axis_only(ax_m)
            fig_m.tight_layout()
            fig_m.savefig(score_type_minimal_path, dpi=160, bbox_inches="tight")
            plt.close(fig_m)

        # Flow funnel plots (requires record_id + per-type thresholds)
        if any(row.get("record_id") for row in predictions) and threshold_by_type:
            flow_preds = _flow_filter_predictions(predictions, threshold_by_type)

            for suffix, out_path in (
                ("after_detail_view", score_type_after_detail_path),
                ("after_captcha", score_type_after_captcha_path),
                ("after_booking", score_type_after_booking_path),
            ):
                subset = flow_preds.get(suffix)
                if subset:
                    fig_f, ax_f = plt.subplots(figsize=(8, 4.8))
                    _plot_score_by_type(
                        ax_f,
                        subset,
                        threshold,
                        missing_heavy_threshold=missing_heavy_threshold,
                        threshold_by_type=threshold_by_type,
                    )
                    ax_f.set_title("P(macro) by Type")
                    fig_f.tight_layout()
                    fig_f.savefig(out_path, dpi=160, bbox_inches="tight")
                    plt.close(fig_f)

                    if minimal_axis_only:
                        min_map = {
                            "after_detail": score_type_after_detail_min_path,
                            "after_captcha": score_type_after_captcha_min_path,
                            "after_booking": score_type_after_booking_min_path,
                        }
                        out_min = min_map.get(suffix)
                        if out_min:
                            fig_fm, ax_fm = plt.subplots(figsize=(8, 4.8))
                            _plot_score_by_type(
                                ax_fm,
                                subset,
                                threshold,
                                missing_heavy_threshold=missing_heavy_threshold,
                                threshold_by_type=threshold_by_type,
                                show_threshold=False,
                            )
                            _apply_minimal_axis_only(ax_fm)
                            fig_fm.tight_layout()
                            fig_fm.savefig(out_min, dpi=160, bbox_inches="tight")
                            plt.close(fig_fm)

            # PPT-friendly stage views:
            # - stage1: DETAIL only (all DETAIL samples)
            # - stage2: DETAIL + CAPTCHA (records that passed DETAIL)
            # - stage3: DETAIL + CAPTCHA + BOOKING (records that passed DETAIL+CAPTCHA)
            stage1 = _subset_types(predictions, {"DETAIL"})
            stage2 = _subset_types(flow_preds.get("after_detail", []), {"DETAIL", "CAPTCHA"})
            stage3 = _subset_types(flow_preds.get("after_captcha", []), {"DETAIL", "CAPTCHA", "BOOKING"})
            stage1_pass = _filter_passed_threshold(stage1, threshold_by_type)
            stage2_pass = _filter_passed_threshold(stage2, threshold_by_type)
            stage3_pass = _filter_passed_threshold(stage3, threshold_by_type)

            for subset, out_path in (
                (stage1, score_type_stage1_path),
                (stage2, score_type_stage2_path),
                (stage3, score_type_stage3_path),
            ):
                if subset:
                    fig_s, ax_s = plt.subplots(figsize=(8, 4.8))
                    _plot_score_by_type(
                        ax_s,
                        subset,
                        threshold,
                        missing_heavy_threshold=missing_heavy_threshold,
                        threshold_by_type=threshold_by_type,
                        fixed_types=["DETAIL", "CAPTCHA", "BOOKING"],
                    )
                    ax_s.set_title("P(macro) by Type")
                    fig_s.tight_layout()
                    fig_s.savefig(out_path, dpi=160, bbox_inches="tight")
                    plt.close(fig_s)

                    if minimal_axis_only:
                        min_map2 = {
                            score_type_stage1_path: score_type_stage1_min_path,
                            score_type_stage2_path: score_type_stage2_min_path,
                            score_type_stage3_path: score_type_stage3_min_path,
                        }
                        out_min2 = min_map2.get(out_path)
                        if out_min2:
                            fig_sm, ax_sm = plt.subplots(figsize=(8, 4.8))
                            _plot_score_by_type(
                                ax_sm,
                                subset,
                                threshold,
                                missing_heavy_threshold=missing_heavy_threshold,
                                threshold_by_type=threshold_by_type,
                                fixed_types=["DETAIL", "CAPTCHA", "BOOKING"],
                                show_threshold=False,
                            )
                            _apply_minimal_axis_only(ax_sm)
                            fig_sm.tight_layout()
                            fig_sm.savefig(out_min2, dpi=160, bbox_inches="tight")
                            plt.close(fig_sm)

            # Passed-only views (next-stage entrants): only points left of each type threshold.
            for subset, out_path in (
                (stage1_pass, score_type_stage1_pass_path),
                (stage2_pass, score_type_stage2_pass_path),
                (stage3_pass, score_type_stage3_pass_path),
            ):
                if subset:
                    fig_p, ax_p = plt.subplots(figsize=(8, 4.8))
                    _plot_score_by_type(
                        ax_p,
                        subset,
                        threshold,
                        missing_heavy_threshold=missing_heavy_threshold,
                        threshold_by_type=threshold_by_type,
                        fixed_types=["DETAIL", "CAPTCHA", "BOOKING"],
                        show_threshold=True,
                    )
                    ax_p.set_title("P(macro) by Type")
                    fig_p.tight_layout()
                    fig_p.savefig(out_path, dpi=160, bbox_inches="tight")
                    plt.close(fig_p)

            # Flow-level confusion matrix + breakdown by stage
            flow_metrics = _compute_flow_metrics(predictions, threshold_by_type)
            if flow_metrics is not None:
                fig_flow_cm, ax_flow_cm = plt.subplots(figsize=(5, 4))
                _plot_flow_confusion_matrix(ax_flow_cm, flow_metrics)
                fig_flow_cm.tight_layout()
                fig_flow_cm.savefig(flow_cm_path, dpi=160, bbox_inches="tight")
                plt.close(fig_flow_cm)

                fig_flow_bd, ax_flow_bd = plt.subplots(figsize=(8, 3.8))
                _plot_flow_breakdown(ax_flow_bd, flow_metrics)
                fig_flow_bd.tight_layout()
                fig_flow_bd.savefig(flow_breakdown_path, dpi=160, bbox_inches="tight")
                plt.close(fig_flow_bd)

                # Booking-stage confusion matrix:
                # Among record_ids that passed CAPTCHA, evaluate ONLY BOOKING decision.
                booking_metrics = _compute_flow_metrics_for_stage(
                    predictions,
                    threshold_by_type,
                    stage="BOOKING",
                    eligible_record_ids=set(flow_preds.get("after_captcha_record_ids", [])),
                    require_stage_present=True,
                )
                if booking_metrics is not None:
                    fig_b, ax_b = plt.subplots(figsize=(5, 4))
                    _plot_flow_confusion_matrix(ax_b, booking_metrics, title_suffix="(BOOKING stage only)")
                    fig_b.tight_layout()
                    fig_b.savefig(flow_cm_booking_path, dpi=160, bbox_inches="tight")
                    plt.close(fig_b)

                booking_stage_cm = _compute_booking_stage_sample_cm(
                    predictions,
                    eligible_record_ids=set(flow_preds.get("after_captcha_record_ids", [])),
                )
                if booking_stage_cm is not None:
                    fig_bc, ax_bc = plt.subplots(figsize=(5, 4))
                    _plot_binary_confusion_matrix(ax_bc, booking_stage_cm["confusion_matrix"], title="Booking Stage CM (samples)")
                    fig_bc.tight_layout()
                    fig_bc.savefig(booking_stage_cm_path, dpi=160, bbox_inches="tight")
                    plt.close(fig_bc)

    result = {
        "summary_png": str(summary_path),
        "confusion_matrix_png": str(cm_path),
        "score_distribution_png": str(score_path),
    }
    if score_type_path.exists():
        result["score_by_type_png"] = str(score_type_path)
    if score_type_no_macro_below_path.exists():
        result["score_by_type_no_macro_below_threshold_png"] = str(score_type_no_macro_below_path)
    if score_type_minimal_path.exists():
        result["score_by_type_minimal_axis_only_png"] = str(score_type_minimal_path)
    if score_type_after_detail_path.exists():
        result["score_by_type_after_detail_png"] = str(score_type_after_detail_path)
    if score_type_after_captcha_path.exists():
        result["score_by_type_after_captcha_png"] = str(score_type_after_captcha_path)
    if score_type_after_booking_path.exists():
        result["score_by_type_after_booking_png"] = str(score_type_after_booking_path)
    if score_type_after_detail_min_path.exists():
        result["score_by_type_after_detail_minimal_axis_only_png"] = str(score_type_after_detail_min_path)
    if score_type_after_captcha_min_path.exists():
        result["score_by_type_after_captcha_minimal_axis_only_png"] = str(score_type_after_captcha_min_path)
    if score_type_after_booking_min_path.exists():
        result["score_by_type_after_booking_minimal_axis_only_png"] = str(score_type_after_booking_min_path)
    if score_type_stage1_path.exists():
        result["score_by_type_stage1_detail_only_png"] = str(score_type_stage1_path)
    if score_type_stage2_path.exists():
        result["score_by_type_stage2_detail_captcha_png"] = str(score_type_stage2_path)
    if score_type_stage3_path.exists():
        result["score_by_type_stage3_detail_captcha_booking_png"] = str(score_type_stage3_path)
    if score_type_stage1_pass_path.exists():
        result["score_by_type_stage1_passed_detail_png"] = str(score_type_stage1_pass_path)
    if score_type_stage2_pass_path.exists():
        result["score_by_type_stage2_passed_captcha_png"] = str(score_type_stage2_pass_path)
    if score_type_stage3_pass_path.exists():
        result["score_by_type_stage3_passed_booking_png"] = str(score_type_stage3_pass_path)
    if score_type_stage1_min_path.exists():
        result["score_by_type_stage1_detail_only_minimal_axis_only_png"] = str(score_type_stage1_min_path)
    if score_type_stage2_min_path.exists():
        result["score_by_type_stage2_detail_captcha_minimal_axis_only_png"] = str(score_type_stage2_min_path)
    if score_type_stage3_min_path.exists():
        result["score_by_type_stage3_detail_captcha_booking_minimal_axis_only_png"] = str(score_type_stage3_min_path)
    if flow_cm_path.exists():
        result["flow_confusion_matrix_png"] = str(flow_cm_path)
    if flow_breakdown_path.exists():
        result["flow_breakdown_png"] = str(flow_breakdown_path)
    if flow_cm_booking_path.exists():
        result["flow_confusion_matrix_booking_stage_png"] = str(flow_cm_booking_path)
    if booking_stage_cm_path.exists():
        result["booking_stage_confusion_matrix_png"] = str(booking_stage_cm_path)
    return result


def _apply_minimal_axis_only(ax: Any) -> None:
    """Keep only x-axis tick values; hide titles/labels/legend/y ticks."""
    ax.set_title("")
    ax.set_xlabel("")
    ax.set_ylabel("")
    try:
        leg = ax.get_legend()
        if leg is not None:
            leg.remove()
    except Exception:
        pass
    ax.set_yticklabels([])
    ax.set_yticks(ax.get_yticks())


def _filter_passed_threshold(
    predictions: list[dict[str, Any]],
    threshold_by_type: dict[str, float],
) -> list[dict[str, Any]]:
    """Keep only points with p_macro < threshold_by_type[type]."""
    out: list[dict[str, Any]] = []
    for row in predictions:
        t = str(row.get("type") or "").strip().upper()
        if not t:
            continue
        thr = threshold_by_type.get(t)
        if thr is None:
            continue
        try:
            if float(row.get("p_macro", 0.0)) < float(thr):
                out.append(row)
        except Exception:
            continue
    return out


def _filter_macro_below_threshold(
    predictions: list[dict[str, Any]],
    threshold: float,
    threshold_by_type: dict[str, float] | None,
) -> list[dict[str, Any]]:
    """Drop macro (y_true==1) points that fall below their threshold."""

    out: list[dict[str, Any]] = []
    for row in predictions:
        try:
            y_true = int(row.get("y_true", 0))
            score = float(row.get("p_macro", 0.0))
        except Exception:
            out.append(row)
            continue

        type_name = str(row.get("type") or "").strip().upper()
        t = float(threshold_by_type.get(type_name, threshold)) if threshold_by_type else float(threshold)
        if y_true == 1 and score < t:
            continue
        out.append(row)
    return out


def _flow_filter_predictions(
    predictions: list[dict[str, Any]],
    threshold_by_type: dict[str, float],
) -> dict[str, list[dict[str, Any]]]:
    """Simulate sequential filtering by stage using record_id.

    A record_id is considered "blocked" at a stage if it contains a sample of that type
    with p_macro >= threshold_by_type[type]. Records missing a stage are treated as passed.
    Returned lists keep the original row dictionaries.
    """

    def t_for(type_name: str) -> float:
        return float(threshold_by_type.get(type_name.upper(), 0.5))

    by_id: dict[str, list[dict[str, Any]]] = {}
    for row in predictions:
        rid = str(row.get("record_id") or "").strip()
        if not rid:
            continue
        by_id.setdefault(rid, []).append(row)

    def is_blocked(rows: list[dict[str, Any]], stage: str) -> bool:
        stage = stage.upper()
        thr = t_for(stage)
        for r in rows:
            if str(r.get("type") or "").strip().upper() != stage:
                continue
            try:
                if float(r.get("p_macro", 0.0)) >= thr:
                    return True
            except Exception:
                continue
        return False

    keep_after_detail: set[str] = set()
    keep_after_captcha: set[str] = set()
    keep_after_booking: set[str] = set()

    for rid, rows in by_id.items():
        if is_blocked(rows, "DETAIL"):
            continue
        keep_after_detail.add(rid)
        if is_blocked(rows, "CAPTCHA"):
            continue
        keep_after_captcha.add(rid)
        if is_blocked(rows, "BOOKING"):
            continue
        keep_after_booking.add(rid)

    def subset(keep: set[str]) -> list[dict[str, Any]]:
        return [row for row in predictions if str(row.get("record_id") or "").strip() in keep]

    return {
        "after_detail": subset(keep_after_detail),
        "after_detail_view": _after_stage_view(predictions, keep_after_detail, stage="DETAIL"),
        "after_captcha": subset(keep_after_captcha),
        "after_booking": subset(keep_after_booking),
        "after_detail_record_ids": sorted(keep_after_detail),
        "after_captcha_record_ids": sorted(keep_after_captcha),
        "after_booking_record_ids": sorted(keep_after_booking),
    }


def _after_stage_view(
    predictions: list[dict[str, Any]],
    keep_record_ids: set[str],
    *,
    stage: str,
) -> list[dict[str, Any]]:
    stage_u = str(stage).strip().upper()
    out: list[dict[str, Any]] = []
    for row in predictions:
        rid = str(row.get("record_id") or "").strip()
        t = str(row.get("type") or "").strip().upper()
        if t == stage_u:
            out.append(row)
            continue
        if rid and rid in keep_record_ids:
            out.append(row)
    return out


def _subset_types(predictions: list[dict[str, Any]], allowed: set[str]) -> list[dict[str, Any]]:
    allowed_u = {str(x).strip().upper() for x in allowed}
    out: list[dict[str, Any]] = []
    for row in predictions:
        t = str(row.get("type") or "").strip().upper()
        if t in allowed_u:
            out.append(row)
    return out


def _compute_flow_metrics(
    predictions: list[dict[str, Any]],
    threshold_by_type: dict[str, float],
) -> dict[str, Any] | None:
    # group by record_id
    by_id: dict[str, list[dict[str, Any]]] = {}
    for row in predictions:
        rid = str(row.get("record_id") or "").strip()
        if not rid:
            continue
        by_id.setdefault(rid, []).append(row)
    if not by_id:
        return None

    def thr(type_name: str) -> float:
        return float(threshold_by_type.get(type_name.upper(), 0.5))

    def blocked_stage(rows: list[dict[str, Any]]) -> str | None:
        for stage in ("DETAIL", "CAPTCHA", "BOOKING"):
            t = thr(stage)
            for r in rows:
                if str(r.get("type") or "").strip().upper() != stage:
                    continue
                try:
                    if float(r.get("p_macro", 0.0)) >= t:
                        return stage
                except Exception:
                    continue
        return None

    # record-level y_true and y_pred
    y_true: list[int] = []
    y_pred: list[int] = []
    breakdown = {"BLOCKED_DETAIL": 0, "BLOCKED_CAPTCHA": 0, "BLOCKED_BOOKING": 0, "PASSED_ALL": 0}
    conflict_labels = 0

    for rid, rows in by_id.items():
        ys = []
        for r in rows:
            try:
                ys.append(int(r.get("y_true")))
            except Exception:
                continue
        ys_set = set(ys)
        if not ys_set:
            continue
        if len(ys_set) > 1:
            conflict_labels += 1
        true = 1 if (1 in ys_set) else 0

        stg = blocked_stage(rows)
        pred = 1 if stg is not None else 0
        y_true.append(true)
        y_pred.append(pred)

        if stg == "DETAIL":
            breakdown["BLOCKED_DETAIL"] += 1
        elif stg == "CAPTCHA":
            breakdown["BLOCKED_CAPTCHA"] += 1
        elif stg == "BOOKING":
            breakdown["BLOCKED_BOOKING"] += 1
        else:
            breakdown["PASSED_ALL"] += 1

    # confusion matrix [[TN, FP],[FN, TP]]
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 0)
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 1)
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 0)
    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 1)

    return {
        "record_count": int(len(y_true)),
        "confusion_matrix": [[tn, fp], [fn, tp]],
        "breakdown": breakdown,
        "conflict_labels": int(conflict_labels),
    }


def _compute_flow_metrics_for_stage(
    predictions: list[dict[str, Any]],
    threshold_by_type: dict[str, float],
    *,
    stage: str,
    eligible_record_ids: set[str] | None,
    require_stage_present: bool,
) -> dict[str, Any] | None:
    stage_u = str(stage).strip().upper()

    by_id: dict[str, list[dict[str, Any]]] = {}
    for row in predictions:
        rid = str(row.get("record_id") or "").strip()
        if not rid:
            continue
        if eligible_record_ids is not None and rid not in eligible_record_ids:
            continue
        by_id.setdefault(rid, []).append(row)
    if not by_id:
        return None

    thr = float(threshold_by_type.get(stage_u, 0.5))

    y_true: list[int] = []
    y_pred: list[int] = []
    missing_stage = 0
    conflict_labels = 0

    for _rid, rows in by_id.items():
        ys = []
        has_stage = False
        pred_macro = False
        for r in rows:
            try:
                ys.append(int(r.get("y_true")))
            except Exception:
                pass
            if str(r.get("type") or "").strip().upper() == stage_u:
                has_stage = True
                try:
                    if float(r.get("p_macro", 0.0)) >= thr:
                        pred_macro = True
                except Exception:
                    pass
        if require_stage_present and not has_stage:
            missing_stage += 1
            continue
        ys_set = set(ys)
        if not ys_set:
            continue
        if len(ys_set) > 1:
            conflict_labels += 1
        true = 1 if (1 in ys_set) else 0
        y_true.append(true)
        y_pred.append(1 if pred_macro else 0)

    if not y_true:
        return None

    tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 0)
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 1)
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 0)
    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 1)

    return {
        "record_count": int(len(y_true)),
        "confusion_matrix": [[tn, fp], [fn, tp]],
        "conflict_labels": int(conflict_labels),
        "missing_stage_dropped": int(missing_stage),
        "stage": stage_u,
        "threshold": float(thr),
    }


def _plot_flow_confusion_matrix(ax: Any, flow_metrics: dict[str, Any], *, title_suffix: str = "") -> None:
    try:
        from sklearn.metrics import ConfusionMatrixDisplay
    except Exception:  # pragma: no cover
        return
    cm = np.asarray(flow_metrics["confusion_matrix"], dtype=int)
    ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=["human", "macro"]).plot(
        ax=ax,
        cmap="Blues",
        colorbar=False,
        values_format="d",
    )
    ax.set_title(f"Flow Confusion Matrix (n={flow_metrics.get('record_count')}) {title_suffix}".rstrip())


def _plot_binary_confusion_matrix(ax: Any, cm: list[list[int]] | np.ndarray, *, title: str) -> None:
    try:
        from sklearn.metrics import ConfusionMatrixDisplay
    except Exception:  # pragma: no cover
        return
    cm_arr = np.asarray(cm, dtype=int)
    ConfusionMatrixDisplay(confusion_matrix=cm_arr, display_labels=["human", "macro"]).plot(
        ax=ax,
        cmap="Blues",
        colorbar=False,
        values_format="d",
    )
    ax.set_title(title)


def _compute_booking_stage_sample_cm(
    predictions: list[dict[str, Any]],
    *,
    eligible_record_ids: set[str],
) -> dict[str, Any] | None:
    """Sample-level CM for BOOKING stage only, conditional on passing CAPTCHA.

    - Select rows where type==BOOKING and record_id in eligible_record_ids.
    - Use already-computed `pred` / `y_true` in predictions (so it respects the configured threshold).
    """
    rows = [
        r
        for r in predictions
        if str(r.get("type") or "").strip().upper() == "BOOKING"
        and str(r.get("record_id") or "").strip() in eligible_record_ids
    ]
    if not rows:
        return None

    y_true = np.asarray([int(r["y_true"]) for r in rows], dtype=int)
    y_pred = np.asarray([int(r["pred"]) for r in rows], dtype=int)

    try:
        from sklearn.metrics import confusion_matrix
    except Exception:  # pragma: no cover
        return None

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1]).tolist()
    return {"sample_count": int(len(rows)), "confusion_matrix": cm}


def _plot_flow_breakdown(ax: Any, flow_metrics: dict[str, Any]) -> None:
    bd = flow_metrics.get("breakdown") or {}
    labels = ["BLOCKED_DETAIL", "BLOCKED_CAPTCHA", "BLOCKED_BOOKING", "PASSED_ALL"]
    values = [int(bd.get(k, 0)) for k in labels]
    ax.bar(labels, values, color=["#111827", "#374151", "#6B7280", "#10B981"])
    ax.set_title("Flow Breakdown by Stage")
    ax.set_ylabel("record_id count")
    ax.tick_params(axis="x", rotation=15)
    _style_axes(ax)


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
    threshold_by_type: dict[str, float] | None,
    fixed_types: list[str] | None = None,
    show_threshold: bool = True,
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

    types = [str(row.get("type") or "").strip().upper() for row in predictions]
    scores = np.asarray([float(row["p_macro"]) for row in predictions], dtype=float)
    y_true = np.asarray([int(row["y_true"]) for row in predictions], dtype=int)

    # Keep canonical order for the known stages
    if fixed_types:
        ordered_types = [str(t).strip().upper() for t in fixed_types]
    else:
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
            ax.scatter(
                scores[human_idx],
                (np.full(int(np.sum(human_idx)), i, dtype=float) + rng.normal(0.0, 0.06, size=int(np.sum(human_idx)))),
                s=18,
                alpha=0.55,
                color=color,
                marker="o",
                edgecolors="none",
                label=t,
            )
        if np.any(macro_idx):
            ax.scatter(
                scores[macro_idx],
                (np.full(int(np.sum(macro_idx)), i, dtype=float) + rng.normal(0.0, 0.06, size=int(np.sum(macro_idx)))),
                s=22,
                alpha=0.7,
                color=macro_color,
                marker="x",
                linewidths=1.2,
                label="macro",
            )

    if show_threshold:
        # Draw per-type threshold segments if provided, else a single global threshold line.
        if threshold_by_type:
            for i, t in enumerate(ordered_types):
                th = threshold_by_type.get(str(t).strip().upper())
                if th is None:
                    continue
                ax.vlines(
                    float(th),
                    i - 0.28,
                    i + 0.28,
                    color="#111827",
                    linestyle="--",
                    linewidth=1.8,
                )
            ax.text(
                0.995,
                1.02,
                "threshold: per-type",
                transform=ax.transAxes,
                ha="right",
                va="bottom",
                fontsize=10,
                color="#111827",
            )
        else:
            ax.axvline(threshold, color="#111827", linestyle="--", linewidth=1.6, label=f"threshold={threshold:.2f}")
    ax.set_yticks(range(len(ordered_types)))
    ax.set_yticklabels(ordered_types)
    ax.set_xlabel("P(macro)")
    ax.set_xlim(0.0, 1.0)
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

    # Put legend fully outside the plot area (DETAIL/CAPTCHA/BOOKING + macro + threshold).
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
