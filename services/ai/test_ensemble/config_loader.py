from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class EnsembleModelSpec:
    name: str
    model_path: Path
    meta_path: Path | None
    weight: float


@dataclass(frozen=True)
class TypeEnsembleSpec:
    type_name: str
    models: list[EnsembleModelSpec]
    aggregation: str
    threshold: float | None


@dataclass(frozen=True)
class EnsembleTestConfig:
    config_path: Path
    ai_root: Path
    data_dir: Path | None
    jsonl_path: Path | None
    glob_pattern: str
    include_unlabeled: bool
    missing_heavy_threshold: float
    default_threshold: float
    output_json: Path | None
    predictions_jsonl: Path | None
    visualizations_dir: Path | None
    type_ensembles: list[TypeEnsembleSpec]


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


def _ensure_list(value: Any, *, name: str) -> list[Any]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError(f"`{name}` must be a list.")
    return value


def load_ensemble_test_config(config_path: str | Path) -> EnsembleTestConfig:
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
    ensemble = raw.get("ensemble") or {}
    if not isinstance(paths, dict):
        raise ValueError("`paths` must be an object.")
    if not isinstance(evaluation, dict):
        raise ValueError("`evaluation` must be an object.")
    if not isinstance(outputs, dict):
        raise ValueError("`outputs` must be an object.")
    if not isinstance(ensemble, dict):
        raise ValueError("`ensemble` must be an object.")

    data_dir = _resolve_path(paths.get("data_dir"), ai_root)
    jsonl_path = _resolve_path(paths.get("jsonl_path"), ai_root) or _resolve_path(paths.get("data_jsonl"), ai_root)
    if data_dir is None and jsonl_path is None:
        raise ValueError("config must define at least one of paths.data_dir or paths.jsonl_path")

    type_entries = _ensure_list(ensemble.get("types"), name="ensemble.types")
    type_ensembles: list[TypeEnsembleSpec] = []
    for entry in type_entries:
        if not isinstance(entry, dict):
            raise ValueError("Each entry in ensemble.types must be an object.")
        type_name = str(entry.get("type") or "").strip()
        if not type_name:
            raise ValueError("ensemble.types entry must have non-empty `type`.")

        aggregation = str(entry.get("aggregation") or "weighted_mean").strip()
        threshold = entry.get("threshold", None)
        threshold_value = float(threshold) if threshold is not None else None

        models_raw = _ensure_list(entry.get("models"), name=f"ensemble.types[{type_name}].models")
        if not models_raw:
            raise ValueError(f"ensemble.types[{type_name}] must include at least one model spec.")

        models: list[EnsembleModelSpec] = []
        for i, m in enumerate(models_raw):
            if not isinstance(m, dict):
                raise ValueError(f"ensemble.types[{type_name}].models[{i}] must be an object.")
            name = str(m.get("name") or f"{type_name}_m{i+1}")
            model_path = _resolve_path(m.get("model_path"), ai_root)
            meta_path = _resolve_path(m.get("meta_path"), ai_root)
            if model_path is None:
                raise ValueError(f"ensemble.types[{type_name}].models[{i}] must define model_path.")
            weight = float(m.get("weight", 1.0))
            models.append(EnsembleModelSpec(name=name, model_path=model_path, meta_path=meta_path, weight=weight))

        type_ensembles.append(
            TypeEnsembleSpec(
                type_name=type_name,
                models=models,
                aggregation=aggregation,
                threshold=threshold_value,
            )
        )

    return EnsembleTestConfig(
        config_path=config_path,
        ai_root=ai_root,
        data_dir=data_dir,
        jsonl_path=jsonl_path,
        glob_pattern=str(evaluation.get("glob", "**/trial_*.json")),
        include_unlabeled=bool(evaluation.get("include_unlabeled", False)),
        missing_heavy_threshold=float(evaluation.get("missing_heavy_threshold", 0.2)),
        default_threshold=float(evaluation.get("threshold", 0.5)),
        output_json=_resolve_path(outputs.get("metrics_json"), ai_root),
        predictions_jsonl=_resolve_path(outputs.get("predictions_jsonl"), ai_root),
        visualizations_dir=_resolve_path(outputs.get("visualizations_dir"), ai_root),
        type_ensembles=type_ensembles,
    )
