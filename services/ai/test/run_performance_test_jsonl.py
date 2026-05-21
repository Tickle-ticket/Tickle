from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from config_loader import load_performance_test_config
from data_loader import load_artifact
from evaluator import evaluate_binary_classifier
from evaluator import predict_macro_scores
from jsonl_loader import load_jsonl_dataset, samples_to_frame, _find_best_metrics_dict
from visualizer import save_evaluation_plots

DEFAULT_CONFIG_PATH = Path(__file__).with_name("performance_test.yaml")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Evaluate a joblib ML model with meta.json against a JSONL file/folder."
    )
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH), help="Path to YAML/JSON config file.")
    parser.add_argument("--model-path", default=None, help="Override model.joblib path.")
    parser.add_argument("--meta-path", default=None, help="Override meta.json path.")

    parser.add_argument(
        "--data",
        required=False,
        help="JSONL file path or a directory containing *.jsonl files.",
    )
    parser.add_argument("--glob", default="**/*.jsonl", help="Glob pattern under --data when it's a directory.")
    parser.add_argument(
        "--include-unlabeled",
        action="store_true",
        help="Load unlabeled rows too. They are scored but excluded from metrics.",
    )
    parser.add_argument("--threshold", type=float, default=None, help="Override macro decision threshold.")
    parser.add_argument("--output-json", default=None, help="Override metrics JSON output path.")
    parser.add_argument("--predictions-jsonl", default=None, help="Override prediction rows output path.")
    parser.add_argument("--visualizations-dir", default=None, help="Override plot output directory.")
    parser.add_argument(
        "--no-outputs",
        action="store_true",
        help="Do not write any output files/plots (ignores config.outputs unless explicitly overridden).",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Print extra diagnostics (label counts, NaN rates, p_macro distribution).",
    )
    parser.add_argument(
        "--debug-json",
        default=None,
        help="Optional path to write debug diagnostics JSON.",
    )
    return parser.parse_args()


def resolve_override(path: str | None, ai_root: Path, fallback: Path | None) -> Path | None:
    if path is None:
        return fallback
    candidate = Path(path).expanduser()
    if candidate.is_absolute():
        return candidate.resolve()
    return (ai_root / candidate).resolve()


def write_json(path: str | Path, payload: object) -> None:
    path = Path(path).expanduser().resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: str | Path, rows: list[dict]) -> None:
    path = Path(path).expanduser().resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def _safe_percentiles(values: np.ndarray) -> dict[str, float | None]:
    if values.size == 0:
        return {"p0": None, "p1": None, "p5": None, "p50": None, "p95": None, "p99": None, "p100": None}
    qs = [0, 1, 5, 50, 95, 99, 100]
    out: dict[str, float | None] = {}
    for q in qs:
        out[f"p{q}"] = float(np.percentile(values, q))
    return out


def main() -> None:
    args = parse_args()
    config = load_performance_test_config(args.config)

    model_path = resolve_override(args.model_path, config.ai_root, config.model_path)
    meta_path = resolve_override(args.meta_path, config.ai_root, config.meta_path)
    output_json = resolve_override(args.output_json, config.ai_root, config.output_json)
    predictions_jsonl = resolve_override(args.predictions_jsonl, config.ai_root, config.predictions_jsonl)
    visualizations_dir = resolve_override(args.visualizations_dir, config.ai_root, config.visualizations_dir)
    threshold = args.threshold if args.threshold is not None else config.threshold
    if args.no_outputs:
        # Keep console output only; no directories/files created.
        output_json = None
        predictions_jsonl = None
        visualizations_dir = None

    artifact = load_artifact(model_path, meta_path)
    feature_names = artifact.feature_names

    data = args.data
    if data is None:
        if config.jsonl_path is None:
            raise ValueError(
                "JSONL data is required. Pass --data or set paths.jsonl_path in config (services/ai/test/performance_test.yaml)."
            )
        data = str(config.jsonl_path)

    samples = load_jsonl_dataset(
        data,
        feature_names=feature_names,
        pattern=args.glob,
        skip_unlabeled=not args.include_unlabeled,
    )
    x = samples_to_frame(samples, feature_names)

    debug_payload: dict[str, object] | None = None
    if args.debug or args.debug_json:
        # Raw label counts
        label_counts: dict[str, int] = {}
        for sample in samples:
            key = str(sample.label) if sample.label is not None else "None"
            label_counts[key] = label_counts.get(key, 0) + 1

        # NaN rates per feature (input frame)
        nan_rates = (x.isna().mean() * 100.0).to_dict()
        top_nan = sorted(nan_rates.items(), key=lambda kv: kv[1], reverse=True)[:20]

        # Try to find where metrics live for the first line of the first jsonl (best-effort)
        metrics_location = None
        try:
            from jsonl_loader import iter_jsonl_paths
            import json as _json

            first_path = next(iter_jsonl_paths(data, pattern=args.glob))
            with first_path.open("r", encoding="utf-8") as f:
                for raw_line in f:
                    line = raw_line.strip()
                    if not line:
                        continue
                    obj = _json.loads(line)
                    if isinstance(obj, dict):
                        found = _find_best_metrics_dict(obj, feature_names)
                        if found is not None:
                            metrics_location = {"file": str(first_path), "path": found[0], "hit_count": len(set(feature_names).intersection(found[1].keys()))}
                    break
        except Exception:
            metrics_location = None

        # p_macro distribution (all rows, including unlabeled if loaded)
        scores_all = predict_macro_scores(artifact.model, x)
        scores_all = np.asarray(scores_all, dtype=np.float64)
        scores_finite = scores_all[np.isfinite(scores_all)]

        debug_payload = {
            "data": str(Path(data).expanduser().resolve()),
            "sample_count_loaded": int(len(samples)),
            "label_counts_raw": label_counts,
            "nan_rate_percent": nan_rates,
            "nan_rate_top20": top_nan,
            "metrics_location_guess": metrics_location,
            "p_macro": {
                "count": int(scores_all.size),
                "finite_count": int(scores_finite.size),
                "min": float(np.min(scores_finite)) if scores_finite.size else None,
                "max": float(np.max(scores_finite)) if scores_finite.size else None,
                "mean": float(np.mean(scores_finite)) if scores_finite.size else None,
                "std": float(np.std(scores_finite)) if scores_finite.size else None,
                "percentiles": _safe_percentiles(scores_finite),
                "unique_count_approx": int(np.unique(np.round(scores_finite, 6)).size) if scores_finite.size else 0,
            },
        }

    result = evaluate_binary_classifier(
        artifact.model,
        x,
        samples=samples,  # evaluator expects .label and .path (jsonl sample has both)
        label_mapping=artifact.label_mapping,
        threshold=threshold,
    )

    visualization_paths = {}
    if visualizations_dir:
        visualization_paths = save_evaluation_plots(
            result.predictions,
            result.metrics,
            output_dir=visualizations_dir,
            threshold=threshold,
            missing_heavy_threshold=config.missing_heavy_threshold,
            threshold_by_type=config.threshold_by_type,
            minimal_axis_only=config.minimal_axis_only,
        )

    summary = {
        "config_path": str(config.config_path),
        "model_path": str(artifact.model_path),
        "meta_path": str(artifact.meta_path),
        "data": str(Path(data).expanduser().resolve()),
        "glob": args.glob,
        "feature_count": len(feature_names),
        "visualizations": visualization_paths,
        **result.metrics,
    }

    if debug_payload is not None:
        summary["debug"] = debug_payload

    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if output_json:
        write_json(output_json, summary)
    if predictions_jsonl:
        write_jsonl(predictions_jsonl, result.predictions)
    if args.debug_json and debug_payload is not None:
        write_json(args.debug_json, debug_payload)


if __name__ == "__main__":
    main()
