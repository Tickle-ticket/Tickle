from __future__ import annotations

import json
from pathlib import Path
from typing import Any
import threading

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
TRIALS_DIR = DATA_DIR / "trials"
SUMMARY_FILE = DATA_DIR / "trial_summary.jsonl"
EVENTS_FILE = DATA_DIR / "event_rows.jsonl"
WINDOWS_FILE = DATA_DIR / "window_rows.jsonl"
_ALLOC_LOCK = threading.Lock()


def ensure_storage() -> None:
    # trial 개별 파일이 저장될 기본 디렉터리를 만든다.
    TRIALS_DIR.mkdir(parents=True, exist_ok=True)


def append_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return

    with path.open("a", encoding="utf-8") as file:
        for row in rows:
            file.write(json.dumps(row, ensure_ascii=False) + "\n")


def trial_file_path(trial_id: int) -> Path:
    return TRIALS_DIR / f"trial_{trial_id:05d}.json"


def _current_max_trial_id() -> int:
    ensure_storage()
    max_id = 0
    for path in TRIALS_DIR.glob("trial_*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            max_id = max(max_id, int(data.get("trialId") or 0))
        except Exception:
            # best-effort scan
            continue
    return max_id


def allocate_trial_id() -> int:
    """Allocate a new monotonically increasing trial id.

    This prevents accidental overwrites when a client starts from trialId=1
    (e.g. macro clicking before the simulator loads existing trials).
    """
    with _ALLOC_LOCK:
        return _current_max_trial_id() + 1


def _rewrite_nested_trial_ids(payload: dict[str, Any], trial_id: int) -> None:
    # Update top-level
    payload["trialId"] = int(trial_id)

    # Update nested rows if they carry trial_id already (simulator usually does)
    for row in payload.get("eventRows") or []:
        if isinstance(row, dict) and "trial_id" in row:
            row["trial_id"] = int(trial_id)
    for row in payload.get("windowRows") or []:
        if isinstance(row, dict) and "trial_id" in row:
            row["trial_id"] = int(trial_id)


def save_trial_payload(payload: dict[str, Any]) -> tuple[Path, int]:
    ensure_storage()

    # Always assign server-side id to avoid overwriting existing files.
    trial_id = allocate_trial_id()
    _rewrite_nested_trial_ids(payload, trial_id)

    summary = dict(payload.get("summary", {}))
    event_rows_payload = list(payload.get("eventRows", []))
    window_rows_payload = list(payload.get("windowRows", []))
    summary_row = {
        "trial_id": trial_id,
        **summary,
        "event_count": len(event_rows_payload),
        "window_count": len(window_rows_payload),
    }
    event_rows = [{"trial_id": trial_id, **row} for row in event_rows_payload]
    window_rows = [{"trial_id": trial_id, **row} for row in window_rows_payload]

    file_path = trial_file_path(trial_id)
    # trial 원본은 개별 JSON으로 보관한다.
    file_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    # 분석 편의를 위해 summary / event / window row를 별도 JSONL로도 누적한다.
    append_jsonl(SUMMARY_FILE, [summary_row])
    append_jsonl(EVENTS_FILE, event_rows)
    append_jsonl(WINDOWS_FILE, window_rows)

    return file_path, trial_id


def list_trials() -> list[dict[str, Any]]:
    ensure_storage()
    trials: list[dict[str, Any]] = []

    for path in sorted(TRIALS_DIR.glob("trial_*.json")):
        # 저장된 원본 trial JSON을 다시 읽어 목록으로 반환한다.
        payload = json.loads(path.read_text(encoding="utf-8"))
        trials.append(payload)

    trials.sort(key=lambda item: item.get("trialId", 0))
    return trials
