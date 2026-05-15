from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


JsonRecord = dict[str, Any]


def _get_by_dotted_key(record: JsonRecord, key: str) -> Any:
    value: Any = record
    for part in key.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def _set_by_dotted_key(record: JsonRecord, key: str, value: Any) -> None:
    parts = key.split(".")
    cur: Any = record
    for part in parts[:-1]:
        if not isinstance(cur, dict):
            return
        if part not in cur or not isinstance(cur[part], dict):
            cur[part] = {}
        cur = cur[part]
    if isinstance(cur, dict):
        cur[parts[-1]] = value


def _match_any(record: JsonRecord, dotted_key: str, allowed_values: set[str]) -> bool:
    raw = _get_by_dotted_key(record, dotted_key)
    if raw is None:
        return False
    text = str(raw).strip().lower()
    return text in allowed_values


def rewrite_labels_in_jsonl(
    input_path: str | Path,
    *,
    output_path: str | Path | None,
    new_label: str,
    # Filters
    type_key: str | None = None,
    type_values: set[str] | None = None,
    event_id_key: str | None = None,
    event_id_values: set[str] | None = None,
    # Label write targets
    label_key: str = "label",
    update_summary_label: bool = True,
    dry_run: bool = False,
) -> dict[str, Any]:
    """
    Rewrite JSONL record labels with optional filters.

    - 기본: record['label']을 new_label로 변경(없으면 생성)
    - update_summary_label=True면 record['summary']['label']도 같이 변경
    - type/eventId 조건을 주면 해당 조건을 만족하는 row만 변경
    """
    src = Path(input_path).expanduser().resolve()
    if not src.exists() or not src.is_file():
        raise FileNotFoundError(f"Input jsonl not found: {src}")

    dst = Path(output_path).expanduser().resolve() if output_path else src.with_suffix(".rewritten.jsonl")
    if dst.exists() and dst.resolve() == src.resolve():
        raise ValueError("output_path must be different from input_path (use --in-place).")

    total = 0
    matched = 0
    rewritten = 0

    out_lines: list[str] = []
    with src.open("r", encoding="utf-8") as f:
        for line_no, raw_line in enumerate(f, start=1):
            line = raw_line.strip()
            if not line:
                continue
            total += 1

            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON at {src}:{line_no}: {exc.msg}") from exc

            if not isinstance(record, dict):
                # dict 아닌 레코드는 그대로 유지 (그대로 다시 dump)
                out_lines.append(json.dumps(record, ensure_ascii=False))
                continue

            ok = True
            if type_key and type_values is not None:
                ok = ok and _match_any(record, type_key, type_values)
            if event_id_key and event_id_values is not None:
                ok = ok and _match_any(record, event_id_key, event_id_values)

            if ok:
                matched += 1
                before = str(record.get(label_key, "")).strip().lower()
                after = str(new_label).strip()

                if before != after.strip().lower():
                    rewritten += 1

                record[label_key] = after
                if update_summary_label:
                    _set_by_dotted_key(record, "summary.label", after)

            out_lines.append(json.dumps(record, ensure_ascii=False))

    result = {
        "input": str(src),
        "output": str(dst),
        "total_records": total,
        "matched_records": matched,
        "rewritten_records": rewritten,
        "filters": {
            "type_key": type_key,
            "type_values": sorted(type_values) if type_values else None,
            "event_id_key": event_id_key,
            "event_id_values": sorted(event_id_values) if event_id_values else None,
        },
        "new_label": new_label,
        "dry_run": dry_run,
    }

    if not dry_run:
        dst.parent.mkdir(parents=True, exist_ok=True)
        with dst.open("w", encoding="utf-8") as out:
            out.write("\n".join(out_lines) + "\n")

    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Rewrite label field in JSONL with optional filters (type/eventId).")
    parser.add_argument("input", help="Input .jsonl file path.")
    parser.add_argument("--new-label", required=True, help="New label value to set.")

    # Filters
    parser.add_argument(
        "--type-key",
        default=None,
        help="Dotted key for type/stage filter. Example: stage or summary.stage",
    )
    parser.add_argument(
        "--type",
        dest="type_values",
        default=None,
        help="Comma-separated type values to match (case-insensitive). Example: DETAIL,CAPTCHA",
    )
    parser.add_argument(
        "--event-id-key",
        default=None,
        help="Dotted key for eventId filter. Example: eventId or summary.eventId",
    )
    parser.add_argument(
        "--event-id",
        dest="event_id_values",
        default=None,
        help="Comma-separated event id values to match (case-insensitive). Example: 123,456",
    )

    # Output
    parser.add_argument("-o", "--out", default=None, help="Output .jsonl path (default: <input>.rewritten.jsonl).")
    parser.add_argument("--in-place", action="store_true", help="Overwrite input file (write temp then replace).")

    # Behavior
    parser.add_argument("--label-key", default="label", help="Label key to rewrite. Default: label")
    parser.add_argument(
        "--no-summary-label",
        action="store_true",
        help="Do not update summary.label (default: update both label and summary.label).",
    )
    parser.add_argument("--dry-run", action="store_true", help="Do not write file; only print counts.")
    args = parser.parse_args()

    type_values = None
    if args.type_values is not None:
        type_values = {v.strip().lower() for v in str(args.type_values).split(",") if v.strip()}

    event_id_values = None
    if args.event_id_values is not None:
        event_id_values = {v.strip().lower() for v in str(args.event_id_values).split(",") if v.strip()}

    output_path = args.out
    if args.in_place:
        # Write to temp file then replace
        src = Path(args.input).expanduser().resolve()
        tmp = src.with_suffix(".tmp.jsonl")
        result = rewrite_labels_in_jsonl(
            src,
            output_path=tmp,
            new_label=args.new_label,
            type_key=args.type_key,
            type_values=type_values,
            event_id_key=args.event_id_key,
            event_id_values=event_id_values,
            label_key=args.label_key,
            update_summary_label=not args.no_summary_label,
            dry_run=args.dry_run,
        )
        if not args.dry_run:
            tmp.replace(src)
            result["output"] = str(src)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    result = rewrite_labels_in_jsonl(
        args.input,
        output_path=output_path,
        new_label=args.new_label,
        type_key=args.type_key,
        type_values=type_values,
        event_id_key=args.event_id_key,
        event_id_values=event_id_values,
        label_key=args.label_key,
        update_summary_label=not args.no_summary_label,
        dry_run=args.dry_run,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
