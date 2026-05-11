from __future__ import annotations

from typing import Mapping


def to_float_or_nan(value: object) -> float:
    if value is None:
        return float("nan")
    if isinstance(value, bool):
        return float(int(value))
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return float("nan")


def extract_feature_values(metrics: Mapping[str, object], feature_names: list[str]) -> dict[str, float]:
    return {name: to_float_or_nan(metrics.get(name)) for name in feature_names}
