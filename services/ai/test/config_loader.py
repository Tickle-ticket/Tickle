from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class PerformanceTestConfig:
    config_path: Path
    ai_root: Path
    model_path: Path
    meta_path: Path
    data_dir: Path | None
    jsonl_path: Path | None
    glob_pattern: str
    threshold: float
    threshold_by_type: dict[str, float] | None
    missing_heavy_threshold: float
    include_unlabeled: bool
    output_json: Path | None
    predictions_jsonl: Path | None
    visualizations_dir: Path | None
    minimal_axis_only: bool


def _load_mapping(config_path: Path) -> dict[str, Any]:
    text = config_path.read_text(encoding="utf-8")
    if config_path.suffix.lower() in {".yaml", ".yml"}:
        try:
            import yaml
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("Missing dependency: pyyaml is required to read YAML config files.") from exc
        loaded = yaml.safe_load(text) or {}
    else:
        loaded = json.loads(text or "{}")

    if not isinstance(loaded, dict):
        raise ValueError(f"config root must be an object: {config_path}")
    return loaded


def _resolve_path(value: str | None, ai_root: Path) -> Path | None:
    if value is None or str(value).strip() == "":
        return None
    path = Path(str(value)).expanduser()
    if path.is_absolute():
        return path.resolve()
    return (ai_root / path).resolve()


def load_performance_test_config(config_path: str | Path) -> PerformanceTestConfig:
    config_path = Path(config_path).expanduser().resolve()
    if not config_path.exists():
        raise FileNotFoundError(f"config file not found: {config_path}")

    raw = _load_mapping(config_path)
    ai_root = _resolve_path(raw.get("ai_root"), config_path.parent.parent)
    if ai_root is None:
        ai_root = config_path.parent.parent.resolve()

    paths = raw.get("paths") or {}
    evaluation = raw.get("evaluation") or {}
    outputs = raw.get("outputs") or {}
    viz = raw.get("visualizations") or {}
    if not isinstance(paths, dict):
        raise ValueError("`paths` must be an object.")
    if not isinstance(evaluation, dict):
        raise ValueError("`evaluation` must be an object.")
    if not isinstance(outputs, dict):
        raise ValueError("`outputs` must be an object.")
    if not isinstance(viz, dict):
        raise ValueError("`visualizations` must be an object.")

    model_path = _resolve_path(paths.get("model_path"), ai_root)
    meta_path = _resolve_path(paths.get("meta_path"), ai_root)
    data_dir = _resolve_path(paths.get("data_dir"), ai_root)
    jsonl_path = _resolve_path(paths.get("jsonl_path"), ai_root) or _resolve_path(paths.get("data_jsonl"), ai_root)
    if model_path is None:
        raise ValueError("config must define paths.model_path")
    if meta_path is None:
        raise ValueError("config must define paths.meta_path")
    if data_dir is None and jsonl_path is None:
        raise ValueError("config must define at least one of paths.data_dir or paths.jsonl_path")

    return PerformanceTestConfig(
        config_path=config_path,
        ai_root=ai_root,
        model_path=model_path,
        meta_path=meta_path,
        data_dir=data_dir,
        jsonl_path=jsonl_path,
        glob_pattern=str(evaluation.get("glob", "**/trial_*.json")),
        threshold=float(evaluation.get("threshold", 0.5)),
        threshold_by_type=(
            {str(k).strip().upper(): float(v) for k, v in (evaluation.get("threshold_by_type") or {}).items()}
            if isinstance(evaluation.get("threshold_by_type"), dict)
            else None
        ),
        missing_heavy_threshold=float(evaluation.get("missing_heavy_threshold", 0.2)),
        include_unlabeled=bool(evaluation.get("include_unlabeled", False)),
        output_json=_resolve_path(outputs.get("metrics_json"), ai_root),
        predictions_jsonl=_resolve_path(outputs.get("predictions_jsonl"), ai_root),
        visualizations_dir=_resolve_path(outputs.get("visualizations_dir"), ai_root),
        minimal_axis_only=bool(viz.get("minimal_axis_only", False)),
    )
