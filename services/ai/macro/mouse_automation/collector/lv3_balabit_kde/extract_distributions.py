"""user 별 6 분포 raw values 추출 (티켓 315 Sub-step B).

Input : data/processed/balabit_kde_input/{user}/{session_id}.jsonl
Output: data/processed/balabit_kde_distributions/{user}_raw.json
        + 검증용 통계 (click 수, move 수, path 수)

6 분포 정의 (분석 chat 검토 완료, plan 가정 채택):
  inter_click_interval_ms       — click ts_ms[i+1] - ts_ms[i]
  mouse_move_dt_ms              — mouse_move 의 dt_ms (첫 move 제외, dt_ms is None skip)
  mouse_move_speed_px_per_ms    — mouse_move 의 speed (첫 move 제외, speed is None skip)
  moves_per_click               — click_i 와 click_i+1 사이 mouse_move 개수 (click-to-click)
  pre_click_avg_speed           — mouse_click 직전 200ms window 내 mouse_move 의 mean(speed)
  stop_segments_per_session     — speed<0.05 mouse_move 연속 구간 수 (학습만, collector 미사용)

실행 (cwd = services/ai/):
    python -m macro.mouse_automation.collector.lv3_balabit_kde.extract_distributions
    python -m macro.mouse_automation.collector.lv3_balabit_kde.extract_distributions --user-filter user7
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path


PRE_CLICK_WINDOW_MS = 200.0
STOP_SPEED_THRESHOLD = 0.05

DISTRIBUTION_NAMES = (
    "inter_click_interval_ms",
    "mouse_move_dt_ms",
    "mouse_move_speed_px_per_ms",
    "moves_per_click",
    "pre_click_avg_speed",
    "stop_segments_per_session",
)


def _load_session_events(jsonl_path: Path) -> list[dict]:
    """jsonl → 이벤트 dict 리스트."""
    events: list[dict] = []
    with open(jsonl_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            events.append(json.loads(line))
    return events


def extract_session_distributions(jsonl_path: Path) -> dict[str, list[float]]:
    """한 jsonl session → {분포명: raw values list} (6 분포)."""
    events = _load_session_events(jsonl_path)
    out: dict[str, list[float]] = {name: [] for name in DISTRIBUTION_NAMES}

    clicks = [e for e in events if e.get("event") == "mouse_click"]
    moves = [e for e in events if e.get("event") == "mouse_move"]

    # 1. inter_click_interval_ms
    for i in range(len(clicks) - 1):
        out["inter_click_interval_ms"].append(
            float(clicks[i + 1]["ts_ms"]) - float(clicks[i]["ts_ms"])
        )

    # 2. mouse_move_dt_ms / 3. mouse_move_speed_px_per_ms (첫 move 제외)
    for m in moves:
        dt = m.get("dt_ms")
        sp = m.get("speed")
        if dt is not None:
            out["mouse_move_dt_ms"].append(float(dt))
        if sp is not None:
            out["mouse_move_speed_px_per_ms"].append(float(sp))

    # 4. moves_per_click — click_i 와 click_i+1 사이 mouse_move 개수
    if len(clicks) >= 2:
        click_ts = [float(c["ts_ms"]) for c in clicks]
        for i in range(len(click_ts) - 1):
            t0, t1 = click_ts[i], click_ts[i + 1]
            cnt = sum(1 for m in moves if t0 < float(m["ts_ms"]) <= t1)
            out["moves_per_click"].append(float(cnt))

    # 5. pre_click_avg_speed — click 직전 200ms 내 mouse_move 의 mean(speed)
    for c in clicks:
        ct = float(c["ts_ms"])
        window_speeds = [
            float(m["speed"]) for m in moves
            if ct - PRE_CLICK_WINDOW_MS <= float(m["ts_ms"]) < ct
            and m.get("speed") is not None
        ]
        if window_speeds:
            out["pre_click_avg_speed"].append(sum(window_speeds) / len(window_speeds))

    # 6. stop_segments_per_session — speed<0.05 연속 구간 수
    in_stop = False
    stop_count = 0
    for m in moves:
        sp = m.get("speed")
        if sp is None:
            in_stop = False
            continue
        if float(sp) < STOP_SPEED_THRESHOLD:
            if not in_stop:
                stop_count += 1
                in_stop = True
        else:
            in_stop = False
    out["stop_segments_per_session"].append(float(stop_count))

    return out


def aggregate_user_distributions(jsonl_paths: list[Path]) -> tuple[dict[str, list[float]], dict]:
    """user 의 모든 session 분포 합산 + 검증용 통계.

    반환: (distributions dict, stats dict).
    stats: {sessions, clicks, moves, paths(=moves_per_click 항목 수)}.
    """
    agg: dict[str, list[float]] = {name: [] for name in DISTRIBUTION_NAMES}
    sessions = 0
    clicks_total = 0
    moves_total = 0

    for jp in jsonl_paths:
        sess = extract_session_distributions(jp)
        for name in DISTRIBUTION_NAMES:
            agg[name].extend(sess[name])
        sessions += 1
        # click 수 = inter_click_interval 항목 + 1 (마지막 click 1개 더 있음)
        clicks_total += len(sess["inter_click_interval_ms"]) + 1 if sess["inter_click_interval_ms"] else 0
        moves_total += len(sess["mouse_move_dt_ms"])
        # 첫 move 1개 제외분 보정 (dt_ms is None 인 첫 move). 단 빈 session 무시.

    stats = {
        "sessions": sessions,
        "clicks_total": clicks_total,
        "moves_total": moves_total,
        "paths_total": len(agg["moves_per_click"]),  # = click-to-click pair 개수
    }
    return agg, stats


def main() -> int:
    parser = argparse.ArgumentParser(
        description="user 별 6 분포 raw values 추출 (티켓 315 Sub-step B)"
    )
    parser.add_argument("--input-dir", type=Path, default=None,
                        help="기본 services/ai/data/processed/balabit_kde_input")
    parser.add_argument("--output-dir", type=Path, default=None,
                        help="기본 services/ai/data/processed/balabit_kde_distributions")
    parser.add_argument("--user-filter", type=str, default=None,
                        help="특정 user 만 처리 (예: user7)")
    args = parser.parse_args()

    ai_root = Path(__file__).resolve().parents[4]
    input_dir = args.input_dir or (ai_root / "data" / "processed" / "balabit_kde_input")
    output_dir = args.output_dir or (ai_root / "data" / "processed" / "balabit_kde_distributions")

    if not input_dir.exists():
        print(f"[error] input dir 없음: {input_dir}")
        return 1

    user_dirs = sorted(d for d in input_dir.iterdir() if d.is_dir())
    if args.user_filter:
        user_dirs = [d for d in user_dirs if d.name == args.user_filter]
    if not user_dirs:
        print(f"[error] user 디렉토리 없음: {input_dir}")
        return 1

    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Input dir:  {input_dir}")
    print(f"Output dir: {output_dir}")
    print(f"Users:      {len(user_dirs)} ({[d.name for d in user_dirs]})")
    print()

    user_results: list[tuple[str, dict, dict]] = []
    for udir in user_dirs:
        jsonls = sorted(udir.glob("*.jsonl"))
        agg, stats = aggregate_user_distributions(jsonls)
        out_path = output_dir / f"{udir.name}_raw.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(agg, f, ensure_ascii=False)
        user_results.append((udir.name, agg, stats))
        dist_summary = ", ".join(f"{name}={len(agg[name])}" for name in DISTRIBUTION_NAMES)
        print(f"[{udir.name}] sessions={stats['sessions']} "
              f"clicks={stats['clicks_total']} moves={stats['moves_total']} "
              f"paths={stats['paths_total']}")
        print(f"  분포 항목 수: {dist_summary}")

    print()
    print("=== Sub-step B - extract 결과 ===")
    print(f"  총 user: {len(user_results)}")
    print(f"  출력 폴더: {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
