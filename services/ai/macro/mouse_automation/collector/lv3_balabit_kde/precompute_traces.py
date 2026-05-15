"""user 별 click-to-click trace pool 사전계산 (티켓 315 Sub-step C).

Input : data/processed/balabit_kde_input/{user}/{session_id}.jsonl
Output: data/processed/balabit_trace_pool/{user}.json

흐름:
  1. extract_paths(events)      — click_i 좌표 → mouse_move 들 → click_i+1 좌표 까지 한 path
                                  (paths = clicks - sessions, click 사이 mouse_move 가 없으면 empty path 로 drop)
  2. normalize_path(path, ...)  — 첫 click 원점 (0,0), 끝 click (1,0) scale + rotate
                                  norm_path 는 [(nx, ny), ...] (x, y 공간 좌표만, ts_ms 미보존)
                                  distance < 1px 이면 None 반환 (호출측에서 drop)
  3. apply_path(norm_path, ...) — collector 측에서 사용. 새 좌표로 inverse transform.
                                  반환: [(x, y), ...] — 공간 점 시퀀스 (timing 은 collector 가 KDE sample)

실행 (cwd = services/ai/):
    python -m macro.mouse_automation.collector.lv3_balabit_kde.precompute_traces
    python -m macro.mouse_automation.collector.lv3_balabit_kde.precompute_traces --user-filter user7
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path


MIN_DISTANCE_PX = 1.0  # < 1px 인 click-to-click 은 noise 로 drop


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


def extract_paths(events: list[dict]) -> list[tuple[
    list[tuple[float, float, float]],
    tuple[float, float],
    tuple[float, float],
]]:
    """click-to-click 사이 mouse_move 시퀀스 추출.

    paths 정의 일관 유지: 한 session 내 click_i (i=0..n-2) 와 click_i+1 사이의 mouse_move.
    → paths_max = clicks - 1 (한 session). user 합산 = total_clicks - sessions.

    반환: [(path_xyt, start_xy, end_xy), ...]
      path_xyt = [(x, y, ts_ms), ...] — 정규화 단계에서 ts_ms 사용 X (drop 예정),
                                          path 추출 단계에서는 디버깅용으로 유지.
    click 사이 mouse_move 가 없으면 (empty path) 호출측에서 drop.
    """
    out: list[tuple[list[tuple[float, float, float]], tuple[float, float], tuple[float, float]]] = []
    clicks: list[dict] = []
    moves: list[dict] = []
    for e in events:
        ev = e.get("event")
        if ev == "mouse_click":
            clicks.append(e)
        elif ev == "mouse_move":
            moves.append(e)
    if len(clicks) < 2:
        return out

    move_idx = 0
    for i in range(len(clicks) - 1):
        c0, c1 = clicks[i], clicks[i + 1]
        t0, t1 = float(c0["ts_ms"]), float(c1["ts_ms"])
        path: list[tuple[float, float, float]] = []
        # move_idx 는 단조 증가 (한 session 내 ts_ms 정렬 가정)
        while move_idx < len(moves) and float(moves[move_idx]["ts_ms"]) <= t0:
            move_idx += 1
        j = move_idx
        while j < len(moves) and float(moves[j]["ts_ms"]) <= t1:
            mv = moves[j]
            path.append((float(mv["x"]), float(mv["y"]), float(mv["ts_ms"])))
            j += 1
        if path:
            out.append((path, (float(c0["x"]), float(c0["y"])), (float(c1["x"]), float(c1["y"]))))
        # 다음 click 으로
    return out


def normalize_path(
    path: list[tuple[float, float, float]],
    start_xy: tuple[float, float],
    end_xy: tuple[float, float],
) -> tuple[list[tuple[float, float]], float] | None:
    """첫 click 원점 (0, 0), 끝 click (1, 0) 으로 scale + rotate.

    norm_path 는 (nx, ny) 공간 좌표만 — ts_ms 미보존 (timing 은 KDE 에서 별도 sample, 책임 분리).
    distance < MIN_DISTANCE_PX 이면 None 반환 (호출측에서 drop).

    반환: (norm_path [(nx, ny), ...], original distance px)
    """
    sx, sy = start_xy
    ex, ey = end_xy
    dx = ex - sx
    dy = ey - sy
    dist = math.sqrt(dx * dx + dy * dy)
    if dist < MIN_DISTANCE_PX:
        return None
    # rotation: 끝점 (dx, dy) → (1, 0)
    # cos/sin 으로 inverse rotate
    cos_t = dx / dist
    sin_t = dy / dist
    norm: list[tuple[float, float]] = []
    for x, y, _ts in path:
        # translate
        rx = x - sx
        ry = y - sy
        # rotate by -theta: [cos sin; -sin cos] * [rx; ry]
        nx = (cos_t * rx + sin_t * ry) / dist
        ny = (-sin_t * rx + cos_t * ry) / dist
        norm.append((nx, ny))
    return norm, dist


def apply_path(
    norm_path: list[tuple[float, float]],
    start_xy: tuple[int, int],
    end_xy: tuple[int, int],
) -> list[tuple[int, int]]:
    """norm_path [(nx, ny), ...] 를 새 좌표로 inverse transform.

    공간 점 시퀀스 [(x, y), ...] 만 반환. timing 은 collector 가 KDE sample.
    inference 시점에서 사용. precompute 모듈에 두는 이유: collector 가 import.
    """
    sx, sy = start_xy
    ex, ey = end_xy
    dx = float(ex - sx)
    dy = float(ey - sy)
    dist = math.sqrt(dx * dx + dy * dy)
    if dist < MIN_DISTANCE_PX:
        return [(int(sx), int(sy)), (int(ex), int(ey))]
    cos_t = dx / dist
    sin_t = dy / dist
    out: list[tuple[int, int]] = []
    for nx, ny in norm_path:
        # scale
        rx = nx * dist
        ry = ny * dist
        # rotate by +theta: [cos -sin; sin cos] * [rx; ry]
        x = cos_t * rx - sin_t * ry + sx
        y = sin_t * rx + cos_t * ry + sy
        out.append((int(round(x)), int(round(y))))
    return out


def process_user(
    user_jsonl_dir: Path,
) -> tuple[list[tuple[list[tuple[float, float]], float]], dict]:
    """한 user 모든 session → [(norm_path, distance), ...] 리스트 + 통계.

    반환: (traces, stats)
    stats = {
        sessions, candidate_paths(=clicks-sessions 정의),
        empty_paths_dropped(click 사이 mouse_move 0),
        short_paths_dropped(distance < 1px),
        traces_kept,
    }
    """
    sessions = 0
    candidate_paths = 0
    empty_paths_dropped = 0
    short_paths_dropped = 0
    traces: list[tuple[list[tuple[float, float]], float]] = []

    for jp in sorted(user_jsonl_dir.glob("*.jsonl")):
        events = _load_session_events(jp)
        sessions += 1
        clicks_n = sum(1 for e in events if e.get("event") == "mouse_click")
        if clicks_n < 2:
            continue
        candidate_paths += clicks_n - 1  # 정의: 한 session 내 click-to-click pair 수
        triples = extract_paths(events)
        # extract_paths 는 empty path 를 자체 drop 하므로 candidate - len(triples) = empty
        empty_paths_dropped += (clicks_n - 1) - len(triples)
        for path, start_xy, end_xy in triples:
            res = normalize_path(path, start_xy, end_xy)
            if res is None:
                short_paths_dropped += 1
                continue
            norm, dist = res
            traces.append((norm, dist))

    stats = {
        "sessions": sessions,
        "candidate_paths": candidate_paths,
        "empty_paths_dropped": empty_paths_dropped,
        "short_paths_dropped": short_paths_dropped,
        "traces_kept": len(traces),
    }
    return traces, stats


def main() -> int:
    parser = argparse.ArgumentParser(
        description="user 별 click-to-click trace pool 사전계산 (티켓 315 Sub-step C)"
    )
    parser.add_argument("--input-dir", type=Path, default=None,
                        help="기본 services/ai/data/processed/balabit_kde_input")
    parser.add_argument("--output-dir", type=Path, default=None,
                        help="기본 services/ai/data/processed/balabit_trace_pool")
    parser.add_argument("--user-filter", type=str, default=None,
                        help="특정 user 만 처리 (예: user7)")
    args = parser.parse_args()

    ai_root = Path(__file__).resolve().parents[4]
    input_dir = args.input_dir or (ai_root / "data" / "processed" / "balabit_kde_input")
    output_dir = args.output_dir or (ai_root / "data" / "processed" / "balabit_trace_pool")

    if not input_dir.exists():
        print(f"[error] input dir 없음: {input_dir}. balabit_to_jsonl 먼저 실행.")
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
    print(f"MIN_DISTANCE_PX: {MIN_DISTANCE_PX}")
    print()

    total_candidate = 0
    total_empty = 0
    total_short = 0
    total_kept = 0
    for udir in user_dirs:
        traces, stats = process_user(udir)
        out_path = output_dir / f"{udir.name}.json"
        # JSON serialize: [[norm_path, distance], ...] where norm_path = [[nx, ny], ...]
        payload = [[[list(p) for p in norm], dist] for norm, dist in traces]
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False)
        print(
            f"[{udir.name}] sessions={stats['sessions']} "
            f"candidate_paths={stats['candidate_paths']} "
            f"empty_drop={stats['empty_paths_dropped']} "
            f"short_drop={stats['short_paths_dropped']} "
            f"kept={stats['traces_kept']}"
        )
        total_candidate += stats["candidate_paths"]
        total_empty += stats["empty_paths_dropped"]
        total_short += stats["short_paths_dropped"]
        total_kept += stats["traces_kept"]

    print()
    print("=== Sub-step C - precompute_traces 결과 ===")
    print(f"  총 user: {len(user_dirs)}")
    print(f"  candidate_paths 합계: {total_candidate}")
    print(f"  empty_drop 합계 (click 사이 mouse_move 0): {total_empty}")
    print(f"  short_drop 합계 (distance < {MIN_DISTANCE_PX}px): {total_short}")
    print(f"  trace 보존 합계: {total_kept}")
    print(f"  출력 폴더: {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
