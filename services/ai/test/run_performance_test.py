from __future__ import annotations

import argparse
import json
from pathlib import Path

from config_loader import load_performance_test_config
from data_loader import load_artifact
from evaluator import evaluate_binary_classifier
from trial_loader import load_trial_dataset, samples_to_frame
from visualizer import save_evaluation_plots

DEFAULT_CONFIG_PATH = Path(__file__).with_name("performance_test.yaml")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Evaluate a joblib ML model with meta.json against a folder of trial_*.json files."
    )
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH), help="Path to YAML/JSON config file.")
    parser.add_argument("--model-path", default=None, help="Override model.joblib path.")
    parser.add_argument("--meta-path", default=None, help="Override meta.json path.")
    parser.add_argument("--data-dir", default=None, help="Override trial_*.json test data directory.")
    parser.add_argument("--glob", default=None, help="Override glob pattern under data-dir.")
    parser.add_argument("--threshold", type=float, default=None, help="Override macro decision threshold.")
    parser.add_argument(
        "--include-unlabeled",
        action="store_true",
        help="Override config and load unlabeled trials too. They are scored but excluded from metrics.",
    )
    parser.add_argument("--output-json", default=None, help="Override metrics JSON output path.")
    parser.add_argument("--predictions-jsonl", default=None, help="Override prediction rows output path.")
    parser.add_argument("--visualizations-dir", default=None, help="Override plot output directory.")
    parser.add_argument(
        "--no-outputs",
        action="store_true",
        help="Do not write any output files/plots (ignores config.outputs unless explicitly overridden).",
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


def main() -> None:
    args = parse_args()
    config = load_performance_test_config(args.config)

    model_path = resolve_override(args.model_path, config.ai_root, config.model_path)
    meta_path = resolve_override(args.meta_path, config.ai_root, config.meta_path)
    data_dir = resolve_override(args.data_dir, config.ai_root, config.data_dir)
    if data_dir is None:
        raise ValueError("data_dir is required for run_performance_test.py. Set paths.data_dir in config or pass --data-dir.")
    output_json = resolve_override(args.output_json, config.ai_root, config.output_json)
    predictions_jsonl = resolve_override(args.predictions_jsonl, config.ai_root, config.predictions_jsonl)
    visualizations_dir = resolve_override(args.visualizations_dir, config.ai_root, config.visualizations_dir)
    glob_pattern = args.glob or config.glob_pattern
    threshold = args.threshold if args.threshold is not None else config.threshold
    include_unlabeled = args.include_unlabeled or config.include_unlabeled

    if args.no_outputs:
        output_json = None
        predictions_jsonl = None
        visualizations_dir = None

    artifact = load_artifact(model_path, meta_path)
    feature_names = artifact.feature_names
    samples = load_trial_dataset(
        data_dir,
        feature_names=feature_names,
        pattern=glob_pattern,
        skip_unlabeled=not include_unlabeled,
    )
    x = samples_to_frame(samples, feature_names)

    result = evaluate_binary_classifier(
        artifact.model,
        x,
        samples=samples,
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
        )

    summary = {
        "config_path": str(config.config_path),
        "model_path": str(artifact.model_path),
        "meta_path": str(artifact.meta_path),
        "data_dir": str(data_dir),
        "feature_count": len(feature_names),
        "visualizations": visualization_paths,
        **result.metrics,
    }

    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if output_json:
        write_json(output_json, summary)
    if predictions_jsonl:
        write_jsonl(predictions_jsonl, result.predictions)


if __name__ == "__main__":
    main()
