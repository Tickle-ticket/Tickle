from __future__ import annotations

import json
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
TRIALS_DIR = DATA_DIR / "trials"
SUMMARY_FILE = DATA_DIR / "trial_summary.jsonl"
EVENTS_FILE = DATA_DIR / "event_rows.jsonl"
WINDOWS_FILE = DATA_DIR / "window_rows.jsonl"


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


def save_trial_payload(payload: dict[str, Any]) -> Path:
    ensure_storage()

    trial_id = int(payload["trialId"])
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

    return file_path


def list_trials() -> list[dict[str, Any]]:
    ensure_storage()
    trials: list[dict[str, Any]] = []

    for path in sorted(TRIALS_DIR.glob("trial_*.json")):
        # 저장된 원본 trial JSON을 다시 읽어 목록으로 반환한다.
        payload = json.loads(path.read_text(encoding="utf-8"))
        trials.append(payload)

    trials.sort(key=lambda item: item.get("trialId", 0))
    return trials
