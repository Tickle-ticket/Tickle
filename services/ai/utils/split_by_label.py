from __future__ import annotations

import argparse
import json
import shutil
from collections.abc import Iterable
from pathlib import Path
from typing import Any, Literal

try:
    from .jsonl_to_json import JsonRecord, read_jsonl
except ImportError:
    from jsonl_to_json import JsonRecord, read_jsonl


OutputFormat = Literal["json", "jsonl"]


def _get_by_dotted_key(record: JsonRecord, key: str) -> Any:
    value: Any = record
    for part in key.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def resolve_label(record: JsonRecord, label_key: str = "label") -> str:
    """Resolve label from top-level label_key, then summary.label."""
    raw_label = _get_by_dotted_key(record, label_key)
    if raw_label is None and label_key == "label":
        raw_label = _get_by_dotted_key(record, "summary.label")
    return str(raw_label).strip().lower() if raw_label is not None else ""


def load_json_records(input_path: str | Path) -> list[JsonRecord]:
    """Load records from a .json or .jsonl file."""
    path = Path(input_path)

    if path.suffix.lower() == ".jsonl":
        return read_jsonl(path)

    with path.open("r", encoding="utf-8") as file:
        payload: Any = json.load(file)

    if isinstance(payload, list):
        records = payload
    elif isinstance(payload, dict) and isinstance(payload.get("records"), list):
        records = payload["records"]
    else:
        raise ValueError(f"Expected a JSON array or object with records list: {path}")

    for index, record in enumerate(records):
        if not isinstance(record, dict):
            raise ValueError(f"Expected JSON object at {path} record index {index}")

    return records


def split_records_by_label(
    records: Iterable[JsonRecord],
    *,
    label_key: str = "label",
    labels: Iterable[str] = ("human", "macro"),
    strict: bool = True,
) -> dict[str, list[JsonRecord]]:
    """Split records into buckets using the label value."""
    allowed_labels = tuple(label.lower() for label in labels)
    buckets: dict[str, list[JsonRecord]] = {label: [] for label in allowed_labels}

    for index, record in enumerate(records):
        label = resolve_label(record, label_key)

        if label not in buckets:
            if strict:
                raise ValueError(
                    f"Unknown label at record index {index}: {label!r}. "
                    f"Allowed labels: {', '.join(allowed_labels)}"
                )
            continue

        buckets[label].append(record)

    return buckets


def derive_dataset_prefix(input_path: str | Path) -> str:
    """Derive data_gN style prefix from an input path when possible."""
    path = Path(input_path)
    if path.is_dir():
        return path.name

    parent_name = path.parent.name

    for suffix in ("_human", "_macro"):
        if parent_name.endswith(suffix):
            return parent_name[: -len(suffix)]

    if parent_name.startswith("data_"):
        return parent_name

    return f"data_{path.stem}"


def split_json_directory_by_label(
    input_dir: str | Path,
    output_root: str | Path | None = None,
    *,
    dataset_prefix: str | None = None,
    label_key: str = "label",
    labels: Iterable[str] = ("human", "macro"),
    strict: bool = True,
    overwrite: bool = True,
) -> dict[str, list[Path]]:
    """Copy trial_*.json files into per-label directories."""
    source_dir = Path(input_dir)
    if not source_dir.is_dir():
        raise ValueError(f"Expected input directory: {source_dir}")

    root = Path(output_root) if output_root is not None else source_dir.parent
    prefix = dataset_prefix or derive_dataset_prefix(source_dir)
    allowed_labels = tuple(label.lower() for label in labels)
    written: dict[str, list[Path]] = {label: [] for label in allowed_labels}

    for source in sorted(source_dir.glob("*.json")):
        with source.open("r", encoding="utf-8") as file:
            record = json.load(file)
        if not isinstance(record, dict):
            raise ValueError(f"Expected JSON object: {source}")

        label = resolve_label(record, label_key)
        if label not in written:
            if strict:
                raise ValueError(
                    f"Unknown label in {source}: {label!r}. "
                    f"Allowed labels: {', '.join(allowed_labels)}"
                )
            continue

        target_dir = root / f"{prefix}_{label}"
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / source.name

        if target.exists() and not overwrite:
            raise FileExistsError(f"Output already exists: {target}")

        shutil.copy2(source, target)
        written[label].append(target)

    return written


def split_file_by_label(
    input_path: str | Path,
    output_root: str | Path | None = None,
    *,
    dataset_prefix: str | None = None,
    label_key: str = "label",
    labels: Iterable[str] = ("human", "macro"),
    output_format: OutputFormat = "json",
    indent: int | None = 2,
    ensure_ascii: bool = False,
    include_empty: bool = False,
    strict: bool = True,
) -> dict[str, Path]:
    """Split a behavior dataset into per-label folders and files.

    The default output root is services/ai/data. For a dataset prefix of
    data_g2, this creates folders such as data_g2_human and data_g2_macro.
    """
    source = Path(input_path)
    if output_format not in ("json", "jsonl"):
        raise ValueError("output_format must be 'json' or 'jsonl'")

    root = Path(output_root) if output_root is not None else Path(__file__).resolve().parents[1] / "data"
    prefix = dataset_prefix or derive_dataset_prefix(source)

    records = load_json_records(source)
    buckets = split_records_by_label(records, label_key=label_key, labels=labels, strict=strict)

    written: dict[str, Path] = {}
    for label, label_records in buckets.items():
        if not label_records and not include_empty:
            continue

        label_dir = root / f"{prefix}_{label}"
        label_dir.mkdir(parents=True, exist_ok=True)

        target = label_dir / f"{source.stem}_{label}.{output_format}"
        if output_format == "jsonl":
            with target.open("w", encoding="utf-8") as file:
                for record in label_records:
                    file.write(json.dumps(record, ensure_ascii=ensure_ascii) + "\n")
        else:
            with target.open("w", encoding="utf-8") as file:
                json.dump(label_records, file, ensure_ascii=ensure_ascii, indent=indent)
                file.write("\n")

        written[label] = target

    return written


def main() -> None:
    parser = argparse.ArgumentParser(description="Split behavior records into human/macro files.")
    parser.add_argument("input", help="Input .json/.jsonl file path or directory containing JSON files.")
    parser.add_argument("--output-root", default=None, help="Output root directory. Defaults to input parent for directories.")
    parser.add_argument("--dataset-prefix", default=None, help="Prefix such as data_g2. Defaults to derived value.")
    parser.add_argument("--label-key", default="label", help="Record field used as label.")
    parser.add_argument("--format", choices=("json", "jsonl"), default="json", help="Output file format.")
    parser.add_argument("--include-empty", action="store_true", help="Also write empty files for labels with no records.")
    parser.add_argument("--skip-unknown-labels", action="store_true", help="Ignore records with unknown labels.")
    parser.add_argument("--no-overwrite", action="store_true", help="Fail if a copied output file already exists.")
    args = parser.parse_args()

    if Path(args.input).is_dir():
        output_paths = split_json_directory_by_label(
            args.input,
            args.output_root,
            dataset_prefix=args.dataset_prefix,
            label_key=args.label_key,
            strict=not args.skip_unknown_labels,
            overwrite=not args.no_overwrite,
        )
        print(
            json.dumps(
                {label: {"count": len(paths), "dir": str(paths[0].parent) if paths else None} for label, paths in output_paths.items()},
                ensure_ascii=False,
            )
        )
        return

    output_paths = split_file_by_label(
        args.input,
        args.output_root,
        dataset_prefix=args.dataset_prefix,
        label_key=args.label_key,
        output_format=args.format,
        include_empty=args.include_empty,
        strict=not args.skip_unknown_labels,
    )

    print(json.dumps({label: str(path) for label, path in output_paths.items()}, ensure_ascii=False))


if __name__ == "__main__":
    main()
