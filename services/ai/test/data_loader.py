from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class ModelArtifact:
    model: Any
    meta: dict[str, Any]
    model_path: Path
    meta_path: Path

    @property
    def feature_names(self) -> list[str]:
        names = self.meta.get("feature_names") or self.meta.get("features")
        if not isinstance(names, list) or not names:
            raise ValueError(
                f"{self.meta_path} must contain a non-empty `feature_names` or `features` list."
            )
        return [str(name) for name in names]

    @property
    def label_mapping(self) -> dict[str, int]:
        mapping = self.meta.get("label_mapping")
        if isinstance(mapping, dict):
            return {str(key): int(value) for key, value in mapping.items()}
        return {"human": 0, "macro": 1}


def load_artifact(model_path: str | Path, meta_path: str | Path) -> ModelArtifact:
    model_path = Path(model_path).expanduser().resolve()
    meta_path = Path(meta_path).expanduser().resolve()

    if not model_path.exists():
        raise FileNotFoundError(f"model joblib not found: {model_path}")
    if not meta_path.exists():
        raise FileNotFoundError(f"meta json not found: {meta_path}")

    try:
        import joblib
    except Exception as exc:  # pragma: no cover
        raise RuntimeError("Missing dependency: joblib. Install joblib or scikit-learn.") from exc

    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    model = joblib.load(model_path)
    return ModelArtifact(model=model, meta=meta, model_path=model_path, meta_path=meta_path)
