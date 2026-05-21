from __future__ import annotations

import argparse
import json
import shutil
from collections.abc import Iterable
from pathlib import Path
from typing import Any

try:
    from .split_by_label import _get_by_dotted_key
except ImportError:
    # Fallback when running as a script (python services/ai/utils/...)
    from split_by_label import _get_by_dotted_key


JsonRecord = dict[str, Any]


def resolve_type(record: JsonRecord, type_key: str = "stage") -> str:
    """Resolve type/stage from a record.

    Supports dotted keys. If the configured key is missing, tries common fallbacks.
    Also normalizes known stage names: DETAIL/CAPTCHA/BOOKING.
    """

    candidates = [type_key]
    if type_key == "stage":
        candidates.extend(["type", "summary.stage", "summary.type"])

    raw = None
    for key in candidates:
        raw = _get_by_dotted_key(record, key)
        if raw is not None:
            break

    text = str(raw).strip() if raw is not None else ""
    if not text:
        return ""

    upper = text.upper()
    if upper in {"DETAIL", "CAPTCHA", "BOOKING"}:
        return upper

    # If value contains these tokens, still map to the canonical stage.
    for token in ("DETAIL", "CAPTCHA", "BOOKING"):
        if token in upper:
            return token

    return text.strip()


def split_json_directory_by_type(
    input_dir: str | Path,
    output_root: str | Path | None = None,
    *,
    type_key: str = "stage",
    types: Iterable[str] | None = None,
    strict: bool = True,
    overwrite: bool = True,
    dir_prefix: str = "type_",
) -> dict[str, list[Path]]:
    """
    Copy trial_*.json (or *.json) into per-type directories.

    Output structure (default):
      <output_root>/<dir_prefix><type>/*.json

    Example types:
      detail, captcha, booking
    """
    source_dir = Path(input_dir)
    if not source_dir.is_dir():
        raise ValueError(f"Expected input directory: {source_dir}")

    root = Path(output_root) if output_root is not None else source_dir
    root.mkdir(parents=True, exist_ok=True)

    # Keep types as provided (case-sensitive folder names). We still match case-insensitively.
    allowed_types = tuple(str(t).strip() for t in (types or ()) if str(t).strip())
    written: dict[str, list[Path]] = {t: [] for t in allowed_types} if allowed_types else {}

    # Prefer trial_*.json if present
    json_paths = sorted(source_dir.glob("trial_*.json"))
    if not json_paths:
        json_paths = sorted(source_dir.glob("*.json"))

    for source in json_paths:
        with source.open("r", encoding="utf-8") as file:
            record = json.load(file)
        if not isinstance(record, dict):
            raise ValueError(f"Expected JSON object: {source}")

        bucket = resolve_type(record, type_key)
        if not bucket:
            if strict:
                raise ValueError(f"Type not found in {source} using key {type_key!r}")
            continue

        if allowed_types and bucket.upper() not in {t.upper() for t in written.keys()}:
            if strict:
                raise ValueError(f"Unknown type in {source}: {bucket!r}. Allowed: {', '.join(allowed_types)}")
            continue

        # Normalize to canonical stage folder name when possible.
        folder = bucket.upper() if bucket.upper() in {"DETAIL", "CAPTCHA", "BOOKING"} else bucket
        target_dir = root / f"{dir_prefix}{folder}"
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / source.name

        if target.exists() and not overwrite:
            raise FileExistsError(f"Output already exists: {target}")

        shutil.copy2(source, target)
        written.setdefault(folder, []).append(target)

    return written


def main() -> None:
    parser = argparse.ArgumentParser(description="Split trial JSON files into per-type(stage) folders.")
    parser.add_argument("input_dir", help="Directory containing trial_*.json (or *.json).")
    parser.add_argument(
        "--output-root",
        default=None,
        help="Output root directory. Defaults to input_dir (creates subfolders under it).",
    )
    parser.add_argument("--type-key", default="stage", help="Dotted key to read stage/type. Default: stage")
    parser.add_argument(
        "--types",
        default="",
        help="Comma-separated allowed types (optional). If empty, accept any non-empty type.",
    )
    parser.add_argument("--skip-unknown-types", action="store_true", help="Ignore records with unknown/empty type.")
    parser.add_argument("--no-overwrite", action="store_true", help="Fail if output already exists.")
    parser.add_argument("--dir-prefix", default="type_", help="Output directory prefix. Default: type_")
    args = parser.parse_args()

    types = tuple(t.strip().lower() for t in args.types.split(",") if t.strip())
    written = split_json_directory_by_type(
        args.input_dir,
        args.output_root,
        type_key=args.type_key,
        types=types if types else None,
        strict=not args.skip_unknown_types,
        overwrite=not args.no_overwrite,
        dir_prefix=args.dir_prefix,
    )
    print(json.dumps({k: len(v) for k, v in written.items()}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
