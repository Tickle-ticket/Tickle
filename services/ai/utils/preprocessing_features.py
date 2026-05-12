from __future__ import annotations

import argparse
import json
from collections.abc import MutableMapping
from pathlib import Path
from typing import Any

WINDOWS_MS = (300, 500)


def parse_path_pattern(value: object) -> tuple[float | None, float | None]:
    if not isinstance(value, str):
        return (None, None)

    parts = value.split("|", 1)
    if len(parts) != 2:
        return (None, None)

    distance_text = parts[0].replace("px", "").strip()
    straightness_text = parts[1].replace("straight", "").strip()
    try:
        return (float(distance_text), float(straightness_text))
    except ValueError:
        return (None, None)


def replace_path_pattern_features(
    row: MutableMapping[str, Any],
    *,
    overwrite: bool = False,
    keep_raw: bool = False,
) -> bool:
    """Replace raw path pattern strings with numeric derived features.

    Example:
    - pre_click_mouse_path_pattern_300ms: "12.3px | straight 0.98"
    + pre_click_path_300ms_total_distance_px: 12.3
    + pre_click_path_300ms_straightness: 0.98
    """

    changed = False

    for sec in WINDOWS_MS:
        raw_col = f"pre_click_mouse_path_pattern_{sec}ms"
        distance_col = f"pre_click_path_{sec}ms_total_distance_px"
        straightness_col = f"pre_click_path_{sec}ms_straightness"

        if raw_col not in row:
            continue

        distance_value, straightness_value = parse_path_pattern(row.get(raw_col))
        items = list(row.items())
        insert_idx = next((idx for idx, (key, _value) in enumerate(items) if key == raw_col), len(items))

        rebuilt: dict[str, Any] = {}
        inserted = False
        for key, value in items:
            if key == raw_col:
                if not keep_raw:
                    changed = True
                else:
                    rebuilt[key] = value

                if overwrite or distance_col not in row:
                    rebuilt[distance_col] = distance_value
                    changed = True
                if overwrite or straightness_col not in row:
                    rebuilt[straightness_col] = straightness_value
                    changed = True
                inserted = True
                continue

            if key in {distance_col, straightness_col} and inserted and overwrite:
                changed = True
                continue
            rebuilt[key] = value

        if not inserted:
            rebuilt_items = list(rebuilt.items())
            rebuilt_items[insert_idx:insert_idx] = [
                (distance_col, distance_value),
                (straightness_col, straightness_value),
            ]
            rebuilt = dict(rebuilt_items)
            changed = True

        row.clear()
        row.update(rebuilt)

    return changed


def backfill_trial_payload(
    payload: MutableMapping[str, Any],
    *,
    include_window_rows: bool = False,
    overwrite: bool = False,
    keep_raw: bool = False,
) -> bool:
    changed = False

    metrics = payload.get("metrics")
    if isinstance(metrics, MutableMapping):
        changed |= replace_path_pattern_features(metrics, overwrite=overwrite, keep_raw=keep_raw)

    if include_window_rows:
        window_rows = payload.get("windowRows")
        if isinstance(window_rows, list):
            for row in window_rows:
                if isinstance(row, MutableMapping):
                    changed |= replace_path_pattern_features(row, overwrite=overwrite, keep_raw=keep_raw)

    return changed


def iter_trial_paths(data_dir: str | Path, pattern: str) -> list[Path]:
    root = Path(data_dir).expanduser().resolve()
    if not root.exists():
        raise FileNotFoundError(f"data path not found: {root}")
    if root.is_file():
        return [root]
    return sorted(path for path in root.glob(pattern) if path.is_file())


def backfill_path(
    path: Path,
    *,
    in_place: bool,
    output_dir: Path | None,
    include_window_rows: bool,
    overwrite: bool,
    keep_raw: bool,
) -> bool:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, MutableMapping):
        raise ValueError(f"trial root must be an object: {path}")

    changed = backfill_trial_payload(
        payload,
        include_window_rows=include_window_rows,
        overwrite=overwrite,
        keep_raw=keep_raw,
    )
    if not changed:
        return False

    if output_dir is not None:
        output_dir.mkdir(parents=True, exist_ok=True)
        out_path = output_dir / path.name
        out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return True

    if in_place:
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Backfill pre_click_mouse_path_pattern_* metrics into numeric pre_click_path_* features."
    )
    parser.add_argument("--data-dir", required=True, help="Folder or file containing trial_*.json data.")
    parser.add_argument("--glob", default="trial_*.json", help="Glob pattern when data-dir is a folder.")
    parser.add_argument("--in-place", action="store_true", help="Modify source JSON files.")
    parser.add_argument("--output-dir", default=None, help="Write converted files into this folder instead.")
    parser.add_argument("--include-window-rows", action="store_true", help="Also convert windowRows entries.")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing derived feature values.")
    parser.add_argument("--keep-raw", action="store_true", help="Keep raw pre_click_mouse_path_pattern_* fields.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir).expanduser().resolve() if args.output_dir else None
    if args.in_place and output_dir is not None:
        raise ValueError("Use either --in-place or --output-dir, not both.")

    paths = iter_trial_paths(args.data_dir, args.glob)
    changed_count = 0
    for path in paths:
        changed = backfill_path(
            path,
            in_place=args.in_place,
            output_dir=output_dir,
            include_window_rows=args.include_window_rows,
            overwrite=args.overwrite,
            keep_raw=args.keep_raw,
        )
        changed_count += int(changed)

    mode = "in-place" if args.in_place else "write-copy" if output_dir else "dry-run"
    print(
        json.dumps(
            {
                "mode": mode,
                "scanned": len(paths),
                "changed": changed_count,
                "data_dir": str(Path(args.data_dir).expanduser().resolve()),
                "output_dir": str(output_dir) if output_dir else None,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
