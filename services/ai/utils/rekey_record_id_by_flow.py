from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


JsonRecord = dict[str, Any]


def _safe_upper(x: Any) -> str:
    return str(x).strip().upper()


def _safe_lower(x: Any) -> str:
    return str(x).strip().lower()


def _normalize_stage(value: Any) -> str:
    upper = _safe_upper(value)
    if upper in {"DETAIL", "CAPTCHA", "BOOKING"}:
        return upper
    for token in ("DETAIL", "CAPTCHA", "BOOKING"):
        if token in upper:
            return token
    return upper


def _get_stage(record: JsonRecord) -> str:
    # Common shapes seen in this repo:
    # - record["type"] / record["stage"]
    # - record["summary"]["type"] / record["summary"]["stage"]
    for k in ("type", "stage"):
        if k in record:
            v = record.get(k)
            if v is not None:
                s = _normalize_stage(v)
                if s:
                    return s
    summary = record.get("summary")
    if isinstance(summary, dict):
        for k in ("type", "stage"):
            if k in summary:
                v = summary.get(k)
                if v is not None:
                    s = _normalize_stage(v)
                    if s:
                        return s
    return ""


def _normalize_label(value: Any) -> str:
    text = _safe_lower(value)
    if text in {"allow", "human", "0"}:
        return "ALLOW"
    if text in {"block", "macro", "1"}:
        return "BLOCK"
    return _safe_upper(value)


def _get_label(record: JsonRecord) -> str:
    if "label" in record:
        return _normalize_label(record.get("label"))
    summary = record.get("summary")
    if isinstance(summary, dict) and "label" in summary:
        return _normalize_label(summary.get("label"))
    return ""


def _get_trial_id(record: JsonRecord) -> int | None:
    # jsonl rows typically contain trial_id/trialID/trialId
    for k in ("trial_id", "trialID", "trialId", "trialid"):
        if k in record and record.get(k) is not None:
            try:
                return int(record.get(k))
            except Exception:
                return None
    summary = record.get("summary")
    if isinstance(summary, dict):
        for k in ("trial_id", "trialID", "trialId", "trialid"):
            if k in summary and summary.get(k) is not None:
                try:
                    return int(summary.get(k))
                except Exception:
                    return None
    return None


def _read_jsonl(path: Path) -> Iterable[JsonRecord]:
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            yield json.loads(line)


def _write_jsonl(path: Path, rows: Iterable[JsonRecord]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


@dataclass
class RekeyStats:
    input_path: str
    output_path: str
    total_rows: int = 0
    groups: int = 0
    breaks_detail: int = 0
    breaks_label_change: int = 0
    breaks_trial_reset: int = 0
    breaks_trial_gap: int = 0
    breaks_file_boundary: int = 0


def _make_group_record_id(group_index: int) -> str:
    # deterministic + short; safe for downstream joins/plots
    return f"rec_flow_{group_index:08d}"


def rekey_one_jsonl(
    input_path: Path,
    *,
    output_path: Path,
    gap_threshold: int | None = 50,
    start_new_user_at_file_boundary: bool = True,
) -> RekeyStats:
    """
    Rekey record_id by sequential flow:
      DETAIL -> (optional CAPTCHA) -> (optional BOOKING)

    Rules implemented:
    1) When a DETAIL row appears, start a new user group, and assign the new record_id to subsequent rows
       until the next DETAIL row starts another group.
    2) Missing stages are allowed; a DETAIL still starts a new user group.
    3) A group cannot mix labels: if label changes, start a new group.
    4) If trial_id resets (non-increasing) OR jumps too much (gap_threshold), start a new group.
       (This helps when multiple jsonls were concatenated and trial_id restarts or becomes discontinuous.)
    """

    stats = RekeyStats(input_path=str(input_path), output_path=str(output_path))

    group_index = 0
    current_record_id = _make_group_record_id(group_index)
    current_label: str | None = None
    prev_trial_id: int | None = None

    out_rows: list[JsonRecord] = []

    def _start_new_group(reason: str) -> None:
        nonlocal group_index, current_record_id, current_label, prev_trial_id
        group_index += 1
        current_record_id = _make_group_record_id(group_index)
        current_label = None
        prev_trial_id = None
        if reason == "detail":
            stats.breaks_detail += 1
        elif reason == "label":
            stats.breaks_label_change += 1
        elif reason == "trial_reset":
            stats.breaks_trial_reset += 1
        elif reason == "trial_gap":
            stats.breaks_trial_gap += 1
        elif reason == "file_boundary":
            stats.breaks_file_boundary += 1

    if start_new_user_at_file_boundary:
        _start_new_group("file_boundary")

    for rec in _read_jsonl(input_path):
        stats.total_rows += 1

        stage = _get_stage(rec)
        label = _get_label(rec)
        trial_id = _get_trial_id(rec)

        # Rule 4: trial_id discontinuity
        if trial_id is not None and prev_trial_id is not None:
            if trial_id <= prev_trial_id:
                _start_new_group("trial_reset")
            elif gap_threshold is not None and (trial_id - prev_trial_id) > gap_threshold:
                _start_new_group("trial_gap")

        # Rule 1+2: DETAIL starts a new user
        if stage == "DETAIL":
            _start_new_group("detail")

        # Rule 3: label mismatch breaks the group
        if label:
            if current_label is None:
                current_label = label
            elif label != current_label:
                _start_new_group("label")
                current_label = label

        # Apply new record_id, preserve original
        if "record_id" in rec:
            rec.setdefault("original_record_id", rec.get("record_id"))
        rec["record_id"] = current_record_id

        out_rows.append(rec)
        prev_trial_id = trial_id if trial_id is not None else prev_trial_id

    stats.groups = group_index + 1
    _write_jsonl(output_path, out_rows)
    return stats


def _expand_inputs(inputs: list[str]) -> list[Path]:
    out: list[Path] = []
    for raw in inputs:
        raw = str(raw).strip().strip('"').strip("'")
        if not raw:
            continue
        p = Path(raw)
        if any(ch in raw for ch in ["*", "?", "["]):
            out.extend(sorted(Path().glob(raw)))
        elif p.is_dir():
            out.extend(sorted(p.rglob("*.jsonl")))
        else:
            out.append(p)
    # de-dupe while preserving order
    seen = set()
    uniq: list[Path] = []
    for p in out:
        rp = str(p.resolve()) if p.exists() else str(p)
        if rp in seen:
            continue
        seen.add(rp)
        uniq.append(p)
    return uniq


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Rekey `record_id` for concatenated jsonl by sequential flow DETAIL->CAPTCHA->BOOKING."
    )
    parser.add_argument(
        "--inputs",
        nargs="+",
        required=True,
        help="One or more jsonl files/folders/globs. Folders are scanned recursively for *.jsonl.",
    )
    parser.add_argument(
        "--output-dir",
        default=None,
        help="Output directory. Default: alongside each input file (suffix _rekeyed).",
    )
    parser.add_argument(
        "--gap-threshold",
        type=int,
        default=50,
        help="If trial_id jumps by more than this, start a new user group. Use -1 to disable.",
    )
    parser.add_argument(
        "--no-file-boundary-break",
        action="store_true",
        help="Do not force a new user group at each file boundary.",
    )
    args = parser.parse_args()

    inputs = _expand_inputs(args.inputs)
    if not inputs:
        raise SystemExit("No inputs found.")

    out_dir = Path(args.output_dir).expanduser().resolve() if args.output_dir else None
    gap = None if args.gap_threshold < 0 else int(args.gap_threshold)

    reports: list[dict[str, Any]] = []
    for ip in inputs:
        ip = Path(ip).expanduser().resolve()
        if not ip.exists():
            continue
        if out_dir:
            out_path = out_dir / ip.name.replace(".jsonl", "") / f"{ip.stem}.rekeyed.jsonl"
        else:
            out_path = ip.with_name(f"{ip.stem}.rekeyed.jsonl")

        stats = rekey_one_jsonl(
            ip,
            output_path=out_path,
            gap_threshold=gap,
            start_new_user_at_file_boundary=(not args.no_file_boundary_break),
        )
        reports.append(stats.__dict__)
        print(f"[OK] {ip} -> {out_path} groups={stats.groups} rows={stats.total_rows}")

    if out_dir:
        out_dir.mkdir(parents=True, exist_ok=True)
        report_path = out_dir / "rekey_report.json"
        report_path.write_text(json.dumps(reports, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("saved report:", report_path)


if __name__ == "__main__":
    main()

