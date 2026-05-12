from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import pandas as pd

from feature_extractor import extract_feature_values


@dataclass(frozen=True)
class TrialSample:
    path: Path
    trial_id: int | str | None
    label: str | None
    features: dict[str, float]


def _read_json(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("trial json root must be an object")
    return data


def _extract_trial_id(trial: dict[str, Any], path: Path) -> int | str | None:
    if trial.get("trialId") is not None:
        return trial.get("trialId")
    if trial.get("trial_id") is not None:
        return trial.get("trial_id")
    if path.stem.startswith("trial_"):
        suffix = path.stem.split("_", 1)[1]
        try:
            return int(suffix)
        except ValueError:
            return suffix
    return None


def _extract_label(trial: dict[str, Any]) -> str | None:
    if trial.get("label") is not None:
        return str(trial.get("label"))
    summary = trial.get("summary")
    if isinstance(summary, dict) and summary.get("label") is not None:
        return str(summary.get("label"))
    return None


def iter_trial_paths(data_dir: str | Path, pattern: str = "**/trial_*.json") -> Iterable[Path]:
    root = Path(data_dir).expanduser().resolve()
    if not root.exists():
        raise FileNotFoundError(f"test data directory not found: {root}")
    if root.is_file():
        yield root
        return
    yield from sorted(path for path in root.glob(pattern) if path.is_file())


def load_trial_sample(path: str | Path, feature_names: list[str]) -> TrialSample:
    path = Path(path).expanduser().resolve()
    trial = _read_json(path)
    metrics = trial.get("metrics")
    if not isinstance(metrics, dict):
        raise ValueError("trial json must contain a `metrics` object")

    return TrialSample(
        path=path,
        trial_id=_extract_trial_id(trial, path),
        label=_extract_label(trial),
        features=extract_feature_values(metrics, feature_names),
    )


def load_trial_dataset(
    data_dir: str | Path,
    feature_names: list[str],
    pattern: str = "**/trial_*.json",
    skip_unlabeled: bool = True,
) -> list[TrialSample]:
    samples: list[TrialSample] = []
    errors: list[str] = []
    for path in iter_trial_paths(data_dir, pattern=pattern):
        try:
            sample = load_trial_sample(path, feature_names)
        except Exception as exc:
            errors.append(f"{path}: {exc}")
            continue
        if skip_unlabeled and sample.label is None:
            continue
        samples.append(sample)

    if not samples:
        detail = "\n".join(errors[:10])
        raise RuntimeError(f"No valid trial samples loaded from {data_dir}.\n{detail}")
    return samples


def samples_to_frame(samples: list[TrialSample], feature_names: list[str]) -> pd.DataFrame:
    rows = [sample.features for sample in samples]
    return pd.DataFrame(rows, columns=feature_names)
