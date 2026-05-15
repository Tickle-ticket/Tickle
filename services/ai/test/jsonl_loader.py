from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import pandas as pd

from feature_extractor import extract_feature_values


@dataclass(frozen=True)
class JsonlSample:
    path: Path
    line_no: int
    trial_id: int | str | None
    sample_type: str | None
    label: str | None
    features: dict[str, float]


def _extract_trial_id(obj: dict[str, Any]) -> int | str | None:
    for key in ("trialId", "trialID", "trial_id", "eventId", "event_id"):
        if obj.get(key) is not None:
            return obj.get(key)
    summary = obj.get("summary")
    if isinstance(summary, dict):
        for key in ("trialId", "trialID", "trial_id", "eventId", "event_id"):
            if summary.get(key) is not None:
                return summary.get(key)
    return None


def _extract_label(obj: dict[str, Any]) -> str | None:
    if obj.get("label") is not None:
        return str(obj.get("label"))
    summary = obj.get("summary")
    if isinstance(summary, dict) and summary.get("label") is not None:
        return str(summary.get("label"))
    return None


def _extract_type(obj: dict[str, Any]) -> str | None:
    if obj.get("type") is not None:
        return str(obj.get("type"))
    summary = obj.get("summary")
    if isinstance(summary, dict) and summary.get("type") is not None:
        return str(summary.get("type"))
    return None


def iter_jsonl_paths(data: str | Path, pattern: str = "**/*.jsonl") -> Iterable[Path]:
    root = Path(data).expanduser().resolve()
    if not root.exists():
        raise FileNotFoundError(f"jsonl data path not found: {root}")
    if root.is_file():
        yield root
        return
    yield from sorted(path for path in root.glob(pattern) if path.is_file())


def _extract_metrics(obj: dict[str, Any]) -> dict[str, Any] | None:
    """
    Try to find a metrics dict.

    Supported shapes:
    - { ..., "metrics": {...}, ... }  (preferred)
    - { ...feature_name: value... }   (fallback: treat root as metrics)
    """
    metrics = obj.get("metrics")
    if isinstance(metrics, dict):
        return metrics
    return obj


def _iter_dict_candidates(root: Any, *, max_depth: int = 4) -> Iterable[tuple[str, dict[str, Any]]]:
    """
    Yield (path, dict) candidates from a nested JSON object.

    - Only traverses dict/list nodes up to max_depth.
    - Path uses dotted notation + [idx] for lists.
    """
    stack: list[tuple[str, Any, int]] = [("$", root, 0)]
    while stack:
        path, node, depth = stack.pop()
        if isinstance(node, dict):
            yield path, node
            if depth >= max_depth:
                continue
            for k, v in node.items():
                stack.append((f"{path}.{k}", v, depth + 1))
        elif isinstance(node, list):
            if depth >= max_depth:
                continue
            for i, v in enumerate(node):
                stack.append((f"{path}[{i}]", v, depth + 1))


def _find_best_metrics_dict(obj: dict[str, Any], feature_names: list[str]) -> tuple[str, dict[str, Any]] | None:
    """
    Heuristic: find the nested dict that contains the most feature keys.

    This is intentionally permissive because datasets often wrap metrics under
    different keys (e.g., summary.metrics, trial.metrics, features, etc.).
    """
    feature_set = set(feature_names)
    best_path: str | None = None
    best_dict: dict[str, Any] | None = None
    best_hits = 0

    for path, cand in _iter_dict_candidates(obj, max_depth=5):
        hits = len(feature_set.intersection(cand.keys()))
        if hits > best_hits:
            best_hits = hits
            best_path = path
            best_dict = cand

    if best_dict is None or best_hits == 0:
        return None
    return best_path or "$", best_dict


def load_jsonl_dataset(
    data: str | Path,
    *,
    feature_names: list[str],
    pattern: str = "**/*.jsonl",
    skip_unlabeled: bool = True,
) -> list[JsonlSample]:
    samples: list[JsonlSample] = []
    errors: list[str] = []

    for path in iter_jsonl_paths(data, pattern=pattern):
        with path.open("r", encoding="utf-8") as f:
            for line_no, raw_line in enumerate(f, start=1):
                line = raw_line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError as exc:
                    errors.append(f"{path}:{line_no}: invalid json ({exc.msg})")
                    continue

                if not isinstance(obj, dict):
                    continue

                label = _extract_label(obj)
                if skip_unlabeled and label is None:
                    continue

                metrics: dict[str, Any] | None = None

                # 1) Fast paths
                direct = _extract_metrics(obj)
                if isinstance(direct, dict) and any(name in direct for name in feature_names):
                    metrics = direct
                else:
                    # 2) Heuristic search
                    found = _find_best_metrics_dict(obj, feature_names)
                    if found is not None:
                        _found_path, best = found
                        metrics = best

                if metrics is None:
                    errors.append(f"{path}:{line_no}: no metrics/features dict contained expected feature keys")
                    continue

                try:
                    features = extract_feature_values(metrics, feature_names)
                except Exception as exc:
                    errors.append(f"{path}:{line_no}: {exc}")
                    continue

                samples.append(
                    JsonlSample(
                        path=path,
                        line_no=line_no,
                        trial_id=_extract_trial_id(obj),
                        sample_type=_extract_type(obj),
                        label=label,
                        features=features,
                    )
                )

    if not samples:
        detail = "\n".join(errors[:10])
        raise RuntimeError(f"No valid jsonl samples loaded from {data}.\n{detail}")
    return samples


def samples_to_frame(samples: list[JsonlSample], feature_names: list[str]) -> pd.DataFrame:
    rows = [sample.features for sample in samples]
    return pd.DataFrame(rows, columns=feature_names)
