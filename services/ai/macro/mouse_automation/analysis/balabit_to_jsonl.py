"""Balabit raw CSV → user별 JSONL 변환 (KDE 학습 input).

티켓 315 (Step 2 옵션 C). balabit_to_trial.py 의 csv_to_events + compute_deltas
를 import 해 chunking 우회 — 한 CSV session = 한 JSONL 파일.

출력 스키마: 보겸 raw jsonl 과 동일 (lv2/lv3_linear collector EventLogger 출력 호환).
한 줄: {session_id, ts_ms, event, x, y, button?, dx?, dy?, dt_ms?, speed?, source, label}
첫 mouse 이벤트는 dx/dy/dt_ms/speed 키 자체 없음 (compute_deltas 패턴).

EventLogger 사용 X — 이미 변환된 이벤트라 delta 가 사전계산되어 있고, 재계산 시
이중 처리 위험. json.dumps 로 직접 직렬화.

session_id 형식: balabit_{user}_{csv_stem} (12자 hex 컨벤션 깨지나 외부 데이터
추적용 명시적 ID 우선)
source: balabit_{user_name} (user 별 분리 추적)
label: human (Balabit 데이터 본질)

실행 (cwd = services/ai/):
    python -m macro.mouse_automation.analysis.balabit_to_jsonl --dry-run
    python -m macro.mouse_automation.analysis.balabit_to_jsonl
    python -m macro.mouse_automation.analysis.balabit_to_jsonl --user-filter user7
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from macro.mouse_automation.analysis.balabit_to_trial import (
    BALABIT_DEFAULT_ROOT,
    compute_deltas,
    csv_to_events,
)


SOURCE_PREFIX = "balabit_"
LABEL = "human"


def process_session(
    csv_path: Path,
    output_dir: Path,
    user_name: str,
    sentinel_counter: dict,
    unknown_counter: dict,
    dry_run: bool,
) -> tuple[str, int]:
    """한 CSV session → 한 JSONL 파일 (chunking 우회).

    csv_to_events 가 sentinel(65535) 필터 + state→event 매핑 + ts_ms 단위 변환(초→ms)
    까지 한꺼번에 처리. compute_deltas 가 dx/dy/dt_ms/speed in-place 사후계산.

    반환: (session_id, event_count). dry_run=True 면 파일 안 쓰고 카운트만.
    """
    df = pd.read_csv(csv_path)
    events = csv_to_events(df, unknown_counter, sentinel_counter)
    if not events:
        return (f"{SOURCE_PREFIX}{user_name}_{csv_path.stem}", 0)
    compute_deltas(events)

    session_id = f"{SOURCE_PREFIX}{user_name}_{csv_path.stem}"
    source = f"{SOURCE_PREFIX}{user_name}"

    if dry_run:
        return (session_id, len(events))

    out_path = output_dir / f"{session_id}.jsonl"
    with open(out_path, "w", encoding="utf-8") as f:
        for evt in events:
            row = {"session_id": session_id, **evt, "source": source, "label": LABEL}
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    return (session_id, len(events))


def process_user(
    user_dir: Path,
    output_root: Path,
    dry_run: bool,
) -> dict:
    """한 user 모든 session 처리. 반환: 통계 dict."""
    user_name = user_dir.name
    user_out = output_root / user_name
    if not dry_run:
        user_out.mkdir(parents=True, exist_ok=True)

    sentinel_counter: dict = {}
    unknown_counter: dict = {}
    sessions_written = 0
    total_events = 0
    sessions_empty = 0

    for csv_path in sorted(user_dir.glob("session_*")):
        try:
            _sid, n = process_session(
                csv_path, user_out, user_name,
                sentinel_counter, unknown_counter, dry_run,
            )
        except Exception as e:
            print(f"  [warn] {user_name}/{csv_path.name} failed: {e}")
            continue
        if n == 0:
            sessions_empty += 1
            continue
        sessions_written += 1
        total_events += n

    if unknown_counter:
        top = sorted(unknown_counter.items(), key=lambda kv: -kv[1])[:5]
        summary = ", ".join(f"{state}/{btn}={n}" for (state, btn), n in top)
        print(f"  [{user_name}] unknown/dropped state-button: {summary}")
    sentinel_dropped = sentinel_counter.get("dropped", 0)
    if sentinel_dropped:
        print(f"  [{user_name}] sentinel coord (65535) drop: {sentinel_dropped} rows")

    return {
        "user": user_name,
        "sessions_written": sessions_written,
        "sessions_empty": sessions_empty,
        "total_events": total_events,
        "sentinel_dropped": sentinel_dropped,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Balabit raw CSV → user별 JSONL (KDE 학습 input). chunking 우회."
    )
    parser.add_argument("--balabit-root", type=Path, default=BALABIT_DEFAULT_ROOT,
                        help=f"기본 {BALABIT_DEFAULT_ROOT}")
    parser.add_argument("--output-dir", type=Path, default=None,
                        help="기본 services/ai/data/processed/balabit_kde_input")
    parser.add_argument("--user-filter", type=str, default=None,
                        help="특정 user{N} 만 변환 (예: user7)")
    parser.add_argument("--dry-run", action="store_true", help="파일 안 쓰고 카운트만")
    args = parser.parse_args()

    ai_root = Path(__file__).resolve().parents[3]
    output_dir = args.output_dir or (ai_root / "data" / "processed" / "balabit_kde_input")

    if not args.balabit_root.exists():
        print(f"[error] Balabit root 없음: {args.balabit_root}")
        return 1

    user_dirs = sorted(
        d for d in args.balabit_root.iterdir()
        if d.is_dir() and d.name.startswith("user")
    )
    if args.user_filter:
        user_dirs = [d for d in user_dirs if d.name == args.user_filter]
    if not user_dirs:
        print(f"[error] user 디렉토리 없음: {args.balabit_root}")
        return 1

    print(f"Balabit root: {args.balabit_root}")
    print(f"Output dir:   {output_dir}")
    print(f"Users:        {len(user_dirs)} ({[d.name for d in user_dirs]})")
    print(f"dry_run={args.dry_run}")
    print()

    if not args.dry_run:
        output_dir.mkdir(parents=True, exist_ok=True)

    user_results: list[dict] = []
    for udir in user_dirs:
        print(f"[{udir.name}] processing...")
        user_results.append(process_user(udir, output_dir, args.dry_run))

    print()
    print("=== Balabit → JSONL 변환 결과 ===")
    total_sessions = 0
    total_events = 0
    total_sentinel = 0
    total_empty = 0
    for r in user_results:
        print(
            f"  {r['user']:8s}: sessions={r['sessions_written']:3d} "
            f"events={r['total_events']:8d} "
            f"sentinel_drop={r['sentinel_dropped']:5d} "
            f"empty={r['sessions_empty']}"
        )
        total_sessions += r["sessions_written"]
        total_events += r["total_events"]
        total_sentinel += r["sentinel_dropped"]
        total_empty += r["sessions_empty"]

    print("---")
    print(f"  총 sessions: {total_sessions}")
    print(f"  총 events:   {total_events}")
    print(f"  총 sentinel (65535) drop: {total_sentinel} rows")
    print(f"  총 empty sessions: {total_empty}")
    print(f"  출력 폴더: {output_dir}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
