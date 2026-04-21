"""이벤트 저장 서비스.

프로토타입 단계: data/raw/prototype/{session_id}.jsonl 에 append.
정식 DB 전환은 데이터 구조가 안정된 후 Sprint 2-C 에서 진행.
"""
import json
from pathlib import Path
from typing import Iterable, Optional

# services/storage.py 에서 프로젝트 루트까지: parent * 4 (storage.py → services/ → demo-api/ → demo/ → root)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
LOG_DIR = PROJECT_ROOT / "data" / "raw" / "prototype"


def ensure_log_dir() -> Path:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    return LOG_DIR


def _safe_filename(session_id: str) -> str:
    safe = "".join(c for c in session_id if c.isalnum() or c in ("_", "-"))[:80]
    return safe or "unknown"


def append_events(
    session_id: str,
    url: str,
    batch_ts: Optional[int],
    events: Iterable[dict],
) -> Path:
    ensure_log_dir()
    file_path = LOG_DIR / f"{_safe_filename(session_id)}.jsonl"
    with open(file_path, "a", encoding="utf-8") as f:
        for ev in events:
            ev = dict(ev)
            ev["_url"] = url
            ev["_batch_ts"] = batch_ts
            f.write(json.dumps(ev, ensure_ascii=False) + "\n")
    return file_path
