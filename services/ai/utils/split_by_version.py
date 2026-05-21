from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    from .jsonl_to_json import JsonRecord, read_jsonl
except ImportError:
    from jsonl_to_json import JsonRecord, read_jsonl


def _get_feature_value(record: JsonRecord, feature_key: str) -> Any:
    """
    Return feature value from common shapes:
    - DB export: {"features": {...}}
    - trial json: {"metrics": {...}}
    """
    features = record.get("features")
    if isinstance(features, dict) and feature_key in features:
        return features.get(feature_key)

    metrics = record.get("metrics")
    if isinstance(metrics, dict) and feature_key in metrics:
        return metrics.get(feature_key)

    return None


def _derive_filename(
    *,
    record: JsonRecord,
    source_stem: str,
    index: int,
    existing: set[str],
) -> str:
    trial_id = record.get("trialId", record.get("trialID"))
    filename: str

    try:
        trial_no = int(trial_id)
        filename = f"trial_{trial_no:05d}.json"
    except (TypeError, ValueError):
        filename = f"{source_stem}_{index:05d}.json"

    if filename in existing:
        filename = f"{source_stem}_{index:05d}.json"

    existing.add(filename)
    return filename


def split_jsonl_dir_by_version(
    input_dir: str | Path,
    *,
    feature_key: str = "time_from_element_clickable_to_click_ms",
    output_root: str | Path | None = None,
    pattern: str = "*.jsonl",
) -> dict[str, dict[str, Any]]:
    """
    Split JSONL records into v1/v2 directories based on feature_key existence.

    Rule:
    - feature value is null/None -> v1
    - feature value exists (not None) -> v2
    """
    source_dir = Path(input_dir).expanduser().resolve()
    if not source_dir.is_dir():
        raise ValueError(f"Expected a directory path: {source_dir}")

    root = Path(output_root).expanduser().resolve() if output_root else source_dir.parent
    base = source_dir.name
    out_v1 = root / f"{base}_v1"
    out_v2 = root / f"{base}_v2"
    out_v1.mkdir(parents=True, exist_ok=True)
    out_v2.mkdir(parents=True, exist_ok=True)

    written_v1 = 0
    written_v2 = 0
    scanned_files = 0
    scanned_records = 0

    # Track filenames per output dir to avoid collisions across multiple jsonl files.
    existing_v1: set[str] = set(path.name for path in out_v1.glob("*.json"))
    existing_v2: set[str] = set(path.name for path in out_v2.glob("*.json"))

    for jsonl_path in sorted(source_dir.glob(pattern)):
        if not jsonl_path.is_file():
            continue
        scanned_files += 1
        source_stem = jsonl_path.stem

        for index, record in enumerate(read_jsonl(jsonl_path), start=1):
            scanned_records += 1
            value = _get_feature_value(record, feature_key)
            is_v1 = value is None

            if is_v1:
                target_dir = out_v1
                filename = _derive_filename(
                    record=record,
                    source_stem=source_stem,
                    index=scanned_records,
                    existing=existing_v1,
                )
                written_v1 += 1
            else:
                target_dir = out_v2
                filename = _derive_filename(
                    record=record,
                    source_stem=source_stem,
                    index=scanned_records,
                    existing=existing_v2,
                )
                written_v2 += 1

            (target_dir / filename).write_text(
                json.dumps(record, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

    return {
        "v1": {"dir": str(out_v1), "written": written_v1},
        "v2": {"dir": str(out_v2), "written": written_v2},
        "scanned": {"files": scanned_files, "records": scanned_records, "input_dir": str(source_dir)},
        "config": {"feature_key": feature_key, "pattern": pattern, "output_root": str(root)},
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Split JSONL records into <input_dir>_v1/_v2 based on a feature being null vs present."
    )
    parser.add_argument("input_dir", help="Directory containing .jsonl files.")
    parser.add_argument(
        "--feature-key",
        default="time_from_element_clickable_to_click_ms",
        help="Feature key to check under record.features or record.metrics.",
    )
    parser.add_argument(
        "--output-root",
        default=None,
        help="Where to create <input_dir_name>_v1/_v2. Defaults to input_dir parent.",
    )
    parser.add_argument("--pattern", default="*.jsonl", help="Glob pattern for JSONL files (default: *.jsonl).")
    args = parser.parse_args()

    result = split_jsonl_dir_by_version(
        args.input_dir,
        feature_key=args.feature_key,
        output_root=args.output_root,
        pattern=args.pattern,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

