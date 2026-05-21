from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

import numpy as np

from config_loader import load_ensemble_test_config
from data_loader import load_artifact
from evaluator import predict_macro_scores, select_hard_vote_threshold, _hard_vote_pred_and_score  # type: ignore
from jsonl_loader import load_jsonl_dataset, samples_to_frame as jsonl_samples_to_frame
from trial_loader import load_trial_dataset, samples_to_frame


DEFAULT_CONFIG_PATH = Path(__file__).with_name("performance_test_ensemble.yaml")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="BOOKING hard-voting grid search (keeps the rest of test_ensemble unchanged)."
    )
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH), help="Path to YAML/JSON config file.")
    parser.add_argument(
        "--rule",
        default="all",
        choices=["all", "majority"],
        help="Hard voting rule: all (unanimous) or majority (k-of-n).",
    )
    parser.add_argument("--k", type=int, default=None, help="Used when rule=majority. Default: floor(n/2)+1")
    parser.add_argument(
        "--max-fps",
        default="0,1,2,5",
        help="Comma-separated FP constraints to try (on BOOKING human samples).",
    )
    parser.add_argument("--t-min", type=float, default=0.0, help="Vote threshold sweep minimum.")
    parser.add_argument("--t-max", type=float, default=1.0, help="Vote threshold sweep maximum.")
    parser.add_argument("--t-step", type=float, default=0.01, help="Vote threshold sweep step.")
    parser.add_argument(
        "--output-json",
        default=None,
        help="Write results JSON here (default: <visualizations_dir>/booking_hardvote_grid.json if set).",
    )
    return parser.parse_args()


def _write_json(path: str | Path, payload: object) -> None:
    path = Path(path).expanduser().resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _parse_int_list(value: str) -> list[int]:
    out: list[int] = []
    for part in str(value).split(","):
        part = part.strip()
        if part == "":
            continue
        out.append(int(part))
    if not out:
        raise ValueError("--max-fps must include at least one integer")
    return out


def main() -> None:
    args = parse_args()
    config = load_ensemble_test_config(args.config)

    booking_spec = next((te for te in config.type_ensembles if str(te.type_name).strip().upper() == "BOOKING"), None)
    if booking_spec is None:
        raise RuntimeError("No BOOKING entry found in ensemble.types. Add type: BOOKING to the config.")

    # Load BOOKING artifacts
    artifacts = []
    union_features: set[str] = set()
    for spec in booking_spec.models:
        art = load_artifact(spec.name, spec.model_path, spec.meta_path)
        artifacts.append((spec, art))
        union_features.update(art.feature_names)
    union_feature_list = sorted(union_features)

    # Load samples + union frame (same input rules as run_performance_test_ensemble.py)
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

    # Label mapping: assume consistent; take first artifact
    label_mapping = artifacts[0][1].label_mapping

    # BOOKING indices with labels
    def map_label(label: str | None) -> int | None:
        if label is None:
            return None
        label_str = str(label)
        if label_str in label_mapping:
            return int(label_mapping[label_str])
        upper = label_str.strip().upper()
        if upper == "ALLOW":
            return int(label_mapping.get("human", label_mapping.get("HUMAN", 0)))
        if upper == "BLOCK":
            return int(label_mapping.get("macro", label_mapping.get("MACRO", 1)))
        lower_map = {str(k).strip().lower(): int(v) for k, v in label_mapping.items()}
        key = label_str.strip().lower()
        return lower_map.get(key)

    booking_indices = [
        i
        for i, s in enumerate(samples)
        if str(getattr(s, "sample_type", "") or "").strip().upper() == "BOOKING" and map_label(s.label) is not None
    ]
    if not booking_indices:
        raise RuntimeError("No labeled BOOKING samples found in the input data.")

    y_true = np.asarray([int(map_label(samples[i].label)) for i in booking_indices], dtype=int)

    # Per-model score vecs (subset to BOOKING indices)
    score_vecs_sub: list[np.ndarray] = []
    model_names: list[str] = []
    for spec, art in artifacts:
        x_m = x_union[art.feature_names]
        scores = predict_macro_scores(art.model, x_m)[booking_indices]
        score_vecs_sub.append(scores)
        model_names.append(str(spec.name))

    if args.t_step <= 0:
        raise ValueError("--t-step must be > 0")
    candidates = [float(x) for x in np.arange(float(args.t_min), float(args.t_max) + 1e-12, float(args.t_step))]

    results: list[dict[str, Any]] = []
    for max_fp in _parse_int_list(args.max_fps):
        selected_t, selected_stats = select_hard_vote_threshold(
            score_vecs=score_vecs_sub,
            y_true=y_true,
            candidates=candidates,
            rule=args.rule,
            k=args.k,
            max_fp=int(max_fp),
        )
        y_score, y_pred = _hard_vote_pred_and_score(
            score_vecs_sub,
            vote_threshold=float(selected_t),
            rule=args.rule,
            k=args.k,
        )

        tn = int(np.sum((y_true == 0) & (y_pred == 0)))
        fp = int(np.sum((y_true == 0) & (y_pred == 1)))
        fn = int(np.sum((y_true == 1) & (y_pred == 0)))
        tp = int(np.sum((y_true == 1) & (y_pred == 1)))

        precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1 = float((2 * precision * recall) / (precision + recall)) if (precision + recall) > 0 else 0.0
        acc = float((tp + tn) / max(len(y_true), 1))

        results.append(
            {
                "rule": args.rule,
                "k": int(args.k) if args.k is not None else None,
                "max_fp": int(max_fp),
                "selected_vote_threshold": float(selected_t),
                "selected_stats": selected_stats,
                "sample_count": int(len(y_true)),
                "confusion_matrix": [[tn, fp], [fn, tp]],
                "accuracy": acc,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "models": model_names,
            }
        )

    payload = {
        "config_path": str(config.config_path),
        "data_dir": str(config.data_dir) if config.data_dir is not None else None,
        "jsonl_path": str(config.jsonl_path) if config.jsonl_path is not None else None,
        "glob": config.glob_pattern,
        "type": "BOOKING",
        "rule": args.rule,
        "k": int(args.k) if args.k is not None else None,
        "t_sweep": {"min": float(args.t_min), "max": float(args.t_max), "step": float(args.t_step), "n": len(candidates)},
        "results": results,
    }

    output_json = args.output_json
    if output_json is None and config.visualizations_dir is not None:
        output_json = str(Path(config.visualizations_dir) / "booking_hardvote_grid.json")
    if output_json is not None:
        _write_json(output_json, payload)

    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

