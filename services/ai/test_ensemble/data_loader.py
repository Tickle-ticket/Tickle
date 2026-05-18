from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class ModelArtifact:
    name: str
    model: Any
    feature_names: list[str]
    label_mapping: dict[str, int]
    model_path: Path
    meta_path: Path | None


def _load_meta(meta_path: Path) -> dict[str, Any]:
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    if not isinstance(meta, dict):
        raise ValueError("meta.json root must be an object")
    return meta


def _feature_names_from_meta(meta: dict[str, Any], meta_path: Path) -> list[str]:
    names = meta.get("feature_names") or meta.get("features")
    if not isinstance(names, list) or not names:
        raise ValueError(f"{meta_path} must contain a non-empty `feature_names` or `features` list.")
    return [str(name) for name in names]


def _label_mapping_from_meta(meta: dict[str, Any]) -> dict[str, int]:
    mapping = meta.get("label_mapping")
    if isinstance(mapping, dict):
        return {str(key): int(value) for key, value in mapping.items()}
    return {"human": 0, "macro": 1}


def load_artifact(name: str, model_path: str | Path, meta_path: str | Path | None) -> ModelArtifact:
    model_path = Path(model_path).expanduser().resolve()
    meta_path_resolved = Path(meta_path).expanduser().resolve() if meta_path else None

    if not model_path.exists():
        raise FileNotFoundError(f"model joblib not found: {model_path}")
    if meta_path_resolved is not None and not meta_path_resolved.exists():
        raise FileNotFoundError(f"meta json not found: {meta_path_resolved}")

    try:
        import joblib
    except Exception as exc:  # pragma: no cover
        raise RuntimeError("Missing dependency: joblib. Install joblib or scikit-learn.") from exc

    loaded = joblib.load(model_path)

    # Support both:
    # 1) `services/ai/test` format: joblib contains the model object; meta.json holds feature list.
    # 2) notebook-exported dict: {"model": ..., "features": [...], "label_mapping": {...}}
    if isinstance(loaded, dict) and "model" in loaded:
        model = loaded["model"]
        feature_names = loaded.get("features") or loaded.get("feature_names")
        if not isinstance(feature_names, list) or not feature_names:
            raise ValueError(f"{model_path} dict artifact must contain non-empty `features` list.")
        label_mapping = loaded.get("label_mapping")
        if isinstance(label_mapping, dict):
            label_mapping_res = {str(k): int(v) for k, v in label_mapping.items()}
        else:
            label_mapping_res = {"human": 0, "macro": 1}
        return ModelArtifact(
            name=name,
            model=model,
            feature_names=[str(x) for x in feature_names],
            label_mapping=label_mapping_res,
            model_path=model_path,
            meta_path=meta_path_resolved,
        )

    model = loaded
    if meta_path_resolved is None:
        # Common convention: keep `meta.json` next to `model.joblib`.
        sibling = model_path.with_name("meta.json")
        if sibling.exists():
            meta_path_resolved = sibling
        else:
            raise ValueError(
                f"meta_path is required for non-dict joblib artifacts: {model_path} "
                f"(and no sibling meta.json found at {sibling})"
            )
    meta = _load_meta(meta_path_resolved)
    return ModelArtifact(
        name=name,
        model=model,
        feature_names=_feature_names_from_meta(meta, meta_path_resolved),
        label_mapping=_label_mapping_from_meta(meta),
        model_path=model_path,
        meta_path=meta_path_resolved,
    )
