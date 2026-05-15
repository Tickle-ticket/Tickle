from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


JsonRecord = dict[str, Any]


def read_jsonl(input_path: str | Path) -> list[JsonRecord]:
    """Read a JSONL file into a list of JSON objects."""
    path = Path(input_path)
    records: list[JsonRecord] = []

    with path.open("r", encoding="utf-8") as file:
        for line_no, raw_line in enumerate(file, start=1):
            line = raw_line.strip()
            if not line:
                continue

            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON at {path}:{line_no}: {exc.msg}") from exc

            if not isinstance(record, dict):
                raise ValueError(f"Expected JSON object at {path}:{line_no}")

            records.append(record)

    return records


def jsonl_to_json(
    input_path: str | Path,
    output_path: str | Path | None = None,
    *,
    indent: int | None = 2,
    ensure_ascii: bool = False,
) -> Path:
    """Convert a JSONL file to a JSON array file.

    Args:
        input_path: Source .jsonl path.
        output_path: Destination .json path. Defaults to the source stem with
            a .json suffix in the same directory.
        indent: JSON indentation. Use None for compact output.
        ensure_ascii: Passed to json.dump.

    Returns:
        The written output path.
    """
    source = Path(input_path)
    target = Path(output_path) if output_path is not None else source.with_suffix(".json")

    records = read_jsonl(source)
    target.parent.mkdir(parents=True, exist_ok=True)

    with target.open("w", encoding="utf-8") as file:
        json.dump(records, file, ensure_ascii=ensure_ascii, indent=indent)
        file.write("\n")

    return target


def _record_to_trial(record: JsonRecord) -> JsonRecord:
    """Convert DB export shape to the trial JSON shape used by data folders."""
    if "features" not in record:
        return record

    trial_id = record.get("trialId", record.get("trialID"))
    trial: JsonRecord = {
        "trialId": trial_id,
        "label": record.get("label"),
        "summary": record.get("summary", {}),
        "metrics": record["features"],
    }

    for key, value in record.items():
        if key not in {"trialID", "trialId", "label", "summary", "features"}:
            trial[key] = value

    return trial


def jsonl_to_json_files(
    input_path: str | Path,
    output_dir: str | Path | None = None,
    *,
    indent: int | None = 2,
    ensure_ascii: bool = False,
    normalize_trial: bool = True,
) -> list[Path]:
    """Convert each JSONL record to a separate trial_XXXXX.json file."""
    source = Path(input_path)
    target_dir = Path(output_dir) if output_dir is not None else source.with_suffix("")
    target_dir.mkdir(parents=True, exist_ok=True)

    written: list[Path] = []
    for index, record in enumerate(read_jsonl(source), start=1):
        output_record = _record_to_trial(record) if normalize_trial else record
        trial_id = output_record.get("trialId", record.get("trialID", index))

        try:
            trial_no = int(trial_id)
            filename = f"trial_{trial_no:05d}.json"
        except (TypeError, ValueError):
            filename = f"trial_{index:05d}.json"

        target = target_dir / filename
        with target.open("w", encoding="utf-8") as file:
            json.dump(output_record, file, ensure_ascii=ensure_ascii, indent=indent)
            file.write("\n")
        written.append(target)

    return written


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert JSONL records to JSON.")
    parser.add_argument("input", help="Input .jsonl file path.")
    parser.add_argument("-o", "--out", default=None, help="Output .json file path.")
    parser.add_argument(
        "--files",
        action="store_true",
        help="Write one trial_XXXXX.json file per JSONL row.",
    )
    parser.add_argument(
        "--out-dir",
        default=None,
        help="Output directory for --files. Defaults to input filename without suffix.",
    )
    parser.add_argument(
        "--keep-db-shape",
        action="store_true",
        help="Do not convert trialID/features to trialId/metrics when using --files.",
    )
    parser.add_argument("--compact", action="store_true", help="Write compact JSON without indentation.")
    args = parser.parse_args()

    if args.files:
        output_paths = jsonl_to_json_files(
            args.input,
            args.out_dir,
            indent=None if args.compact else 2,
            normalize_trial=not args.keep_db_shape,
        )
        print(
            json.dumps(
                {
                    "input": str(Path(args.input)),
                    "output_dir": str(Path(args.out_dir) if args.out_dir else Path(args.input).with_suffix("")),
                    "records": len(output_paths),
                },
                ensure_ascii=False,
            )
        )
        return

    output_path = jsonl_to_json(
        args.input,
        args.out,
        indent=None if args.compact else 2,
    )

    print(
        json.dumps(
            {
                "input": str(Path(args.input)),
                "output": str(output_path),
                "records": len(read_jsonl(args.input)),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
