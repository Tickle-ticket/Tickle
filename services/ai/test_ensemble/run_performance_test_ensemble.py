from __future__ import annotations

import argparse
import json
from pathlib import Path

from config_loader import load_ensemble_test_config
from data_loader import load_artifact, load_isoforest_artifact
from evaluator import evaluate_type_ensemble
from trial_loader import load_trial_dataset, samples_to_frame
from visualizer import save_evaluation_plots
from jsonl_loader import load_jsonl_dataset, samples_to_frame as jsonl_samples_to_frame

DEFAULT_CONFIG_PATH = Path(__file__).with_name("performance_test_ensemble.yaml")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate per-type ensemble models against trial_*.json test data.")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH), help="Path to YAML/JSON config file.")
    parser.add_argument("--output-json", default=None, help="Override metrics JSON output path.")
    parser.add_argument("--predictions-jsonl", default=None, help="Override prediction rows output path.")
    parser.add_argument("--visualizations-dir", default=None, help="Override plot output directory.")
    parser.add_argument("--no-outputs", action="store_true", help="Do not write any output files/plots.")
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
    config = load_ensemble_test_config(args.config)

    output_json = resolve_override(args.output_json, config.ai_root, config.output_json)
    predictions_jsonl = resolve_override(args.predictions_jsonl, config.ai_root, config.predictions_jsonl)
    visualizations_dir = resolve_override(args.visualizations_dir, config.ai_root, config.visualizations_dir)
    if args.no_outputs:
        output_json = None
        predictions_jsonl = None
        visualizations_dir = None

    # Load all artifacts and union their features for dataset load.
    all_artifacts = []
    union_features: set[str] = set()
    isoforest_by_type: dict[str, object] = {}
    for te in config.type_ensembles:
        for spec in te.models:
            art = load_artifact(spec.name, spec.model_path, spec.meta_path)
            all_artifacts.append((te.type_name, spec, art))
            union_features.update(art.feature_names)

        # Optional 2-stage post-filter (e.g., BOOKING IsolationForest)
        if te.post_filter and bool(te.post_filter.get("enabled", False)):
            pf = te.post_filter
            kind = str(pf.get("kind", "")).strip().lower()
            if kind != "isoforest":
                raise ValueError(f"Unsupported post_filter.kind for {te.type_name}: {pf.get('kind')}")
            model_path = pf.get("model_path")
            meta_path = pf.get("meta_path")
            if model_path is None:
                raise ValueError(f"post_filter.model_path is required for type={te.type_name}")
            iso = load_isoforest_artifact(f"{te.type_name}_isoforest", model_path, meta_path)
            key = str(te.type_name).strip().upper()
            isoforest_by_type[key] = iso
            union_features.update(iso.feature_names)

    union_feature_list = sorted(union_features)
    if config.data_dir is not None:
        samples = load_trial_dataset(
            config.data_dir,
            feature_names=union_feature_list,
            pattern=config.glob_pattern,
            skip_unlabeled=not config.include_unlabeled,
        )
        x_union = samples_to_frame(samples, union_feature_list)
    else:
        assert config.jsonl_path is not None
        samples = load_jsonl_dataset(
            config.jsonl_path,
            feature_names=union_feature_list,
            pattern=config.glob_pattern,
            skip_unlabeled=not config.include_unlabeled,
        )
        x_union = jsonl_samples_to_frame(samples, union_feature_list)

    # Sanity: ensure every observed type is covered by the ensemble config.
    configured_types = {str(te.type_name).strip().upper() for te in config.type_ensembles}
    observed_types = {
        str(getattr(s, "sample_type", "") or "").strip().upper()
        for s in samples
        if getattr(s, "sample_type", None) is not None
    }
    missing_types = sorted(t for t in observed_types if t and t not in configured_types)
    if missing_types:
        raise RuntimeError(
            "Some sample types are present in the input data but not configured in ensemble.types: "
            + ", ".join(missing_types)
        )

    # Evaluate per type
    per_type_results = []
    all_predictions = []
    threshold_by_type = {}
    for te in config.type_ensembles:
        artifacts_for_type = [
            (art.model, art.feature_names, spec.weight, art.name)
            for (tname, spec, art) in all_artifacts
            if str(tname).strip().lower() == str(te.type_name).strip().lower()
        ]
        if not artifacts_for_type:
            continue

        # label_mapping: assume consistent across models; take first
        label_mapping = next(
            art.label_mapping for (tname, spec, art) in all_artifacts if str(tname).strip().lower() == str(te.type_name).strip().lower()
        )
        threshold = te.threshold if te.threshold is not None else config.default_threshold
        threshold_by_type[str(te.type_name).strip().upper()] = float(threshold)

        pf_payload = None
        if te.post_filter and bool(te.post_filter.get("enabled", False)):
            key = str(te.type_name).strip().upper()
            iso = isoforest_by_type.get(key)
            if iso is None:
                raise RuntimeError(f"post_filter enabled but isoforest artifact not loaded for type={te.type_name}")
            pf_payload = {
                "enabled": True,
                "kind": "isoforest",
                "model": iso.model,
                "feature_names": iso.feature_names,
                "decision_function_threshold": iso.decision_function_threshold,
                "review_low": te.post_filter.get("review_low"),
                "review_high": te.post_filter.get("review_high"),
            }

        res = evaluate_type_ensemble(
            type_name=te.type_name,
            artifacts=artifacts_for_type,
            x_union=x_union,
            samples=samples,
            label_mapping=label_mapping,
            threshold=float(threshold),
            aggregation=te.aggregation,
            hard_voting=te.hard_voting,
            post_filter=pf_payload,
        )
        per_type_results.append(res.metrics)
        all_predictions.extend(res.predictions)

    # Overall summary
    summary = {
        "config_path": str(config.config_path),
        "data_dir": str(config.data_dir) if config.data_dir is not None else None,
        "jsonl_path": str(config.jsonl_path) if config.jsonl_path is not None else None,
        "glob": config.glob_pattern,
        "type_metrics": per_type_results,
    }

    visualization_paths = {}
    if visualizations_dir and all_predictions:
        # For overall plots, pass all predictions with type field.
        # Build overall metrics by concatenating predictions.
        import numpy as np
        from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score, average_precision_score

        y_true = np.asarray([int(r["y_true"]) for r in all_predictions], dtype=int)
        y_pred = np.asarray([int(r["pred"]) for r in all_predictions], dtype=int)
        y_score = np.asarray([float(r["p_macro"]) for r in all_predictions], dtype=float)
        cm = confusion_matrix(y_true, y_pred, labels=[0, 1]).tolist()
        metrics_for_plot = {
            "sample_count": int(len(all_predictions)),
            "accuracy": float(accuracy_score(y_true, y_pred)),
            "precision": float(precision_score(y_true, y_pred, zero_division=0)),
            "recall": float(recall_score(y_true, y_pred, zero_division=0)),
            "f1": float(f1_score(y_true, y_pred, zero_division=0)),
            "confusion_matrix": cm,
            "roc_auc": float(roc_auc_score(y_true, y_score)) if len(set(y_true.tolist())) == 2 else None,
            "average_precision": float(average_precision_score(y_true, y_score)) if len(set(y_true.tolist())) == 2 else None,
        }
        visualization_paths = save_evaluation_plots(
            all_predictions,
            metrics_for_plot,
            output_dir=visualizations_dir,
            threshold=config.default_threshold,
            missing_heavy_threshold=config.missing_heavy_threshold,
            threshold_by_type=threshold_by_type,
            minimal_axis_only=config.minimal_axis_only,
        )
        summary["visualizations"] = visualization_paths

    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if output_json:
        write_json(output_json, summary)
    if predictions_jsonl:
        write_jsonl(predictions_jsonl, all_predictions)


if __name__ == "__main__":
    main()
