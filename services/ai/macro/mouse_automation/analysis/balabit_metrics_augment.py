"""Balabit trial.json metrics 후처리 - mouse 7 feature 추가 (Phase A Step 1).

용도: 295 후속 - balabit_to_trial 이 채운 7 feature 외에 mouse 7개를 추가로 채운다.
- 입력: services/ai/data/behavior/trial_91*.json
        (eventRows 가 보존돼있어 재변환 없이 후처리만으로 가능)
- 변경: metrics 의 7개 키만 갱신. summary / eventRows / 다른 metrics 키는 손대지 않음.
- 정본: services/ai/macro/browser_automation/simulator/src/tracking/core.js (deriveMetrics)
- 정합: balabit_to_trial 의 _build_segments 와 동일 segment 정의 사용 (vendored).

추가 feature 7개 (모두 mouse 그룹):
  - mouse_jerk_mean
  - mouse_path_straightness_score
  - mouse_direction_change_count
  - pre_click_path_300ms_total_distance_px
  - pre_click_path_300ms_straightness
  - pre_click_path_500ms_total_distance_px
  - pre_click_path_500ms_straightness

실행 (cwd = services/ai/):
    python -m macro.mouse_automation.analysis.balabit_metrics_augment --dry-run
    python -m macro.mouse_automation.analysis.balabit_metrics_augment
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from statistics import mean

# === 상수 ===

TRIAL_GLOB = "trial_91*.json"
PRE_CLICK_WINDOWS_MS: tuple[int, ...] = (300, 500)
DIRECTION_CHANGE_THRESHOLD_RAD = math.pi / 6  # core.js: > Math.PI / 6 (=30도)

AUGMENT_KEYS: tuple[str, ...] = (
    "mouse_jerk_mean",
    "mouse_path_straightness_score",
    "mouse_direction_change_count",
    "pre_click_path_300ms_total_distance_px",
    "pre_click_path_300ms_straightness",
    "pre_click_path_500ms_total_distance_px",
    "pre_click_path_500ms_straightness",
)

PROTECTED_TOP_KEYS: tuple[str, ...] = ("trialId", "label", "summary", "eventRows")


# === segment 빌더 (balabit_to_trial._build_segments 와 동일, vendored) ===

def _angle(dx: float, dy: float) -> float:
    return math.atan2(dy, dx)


def _build_segments(moves: list[dict]) -> list[dict]:
    """mouse_move 이벤트 -> segment 리스트.

    chunk 첫 mouse_move 는 dx/dy/dt_ms/speed 키가 없어 자동 skip
    (core.js moveSegments 의 i=1 부터 빌드와 결과 동일 — segment 수 = moves - 1).
    """
    segments: list[dict] = []
    for m in moves:
        dx = m.get("dx")
        dy = m.get("dy")
        dt = m.get("dt_ms")
        speed = m.get("speed")
        if dx is None or dy is None or dt is None or dt <= 0:
            continue
        dist = math.sqrt(dx * dx + dy * dy)
        segments.append({
            "dt": dt,
            "dist": dist,
            "speed": speed if speed is not None else (dist / dt),
            "angle": _angle(dx, dy),
        })
    return segments


# === 7 feature 산출 ===

def compute_augmented_metrics(events: list[dict]) -> dict:
    """eventRows -> 7개 feature dict.

    null 정책 (lv2 정본 = core.js 와 정합):
      - mouse_jerk_mean: jerks 가 비면 None (segments < 3)
      - mouse_path_straightness_score: moves < 2 또는 totalTravel == 0 이면 None
      - mouse_direction_change_count: 항상 정수 (segments <= 1 이면 0) — core.js .filter().length 패턴
      - pre_click_path_*: clicks 가 0개거나 windowed subset < 2 면 4개 모두 None.
        총거리 == 0 이면 straightness 0.0 (core.js 동일).
    """
    out: dict = {key: None for key in AUGMENT_KEYS}
    if not events:
        return out

    moves = [e for e in events if e.get("event") == "mouse_move"]
    clicks = [e for e in events if e.get("event") == "mouse_click"]
    segments = _build_segments(moves)

    # accelerations / direction_changes — segments 인접 쌍 기준 (i=1..n-1)
    accelerations: list[float] = []
    direction_changes: list[float] = []
    for i in range(1, len(segments)):
        prev = segments[i - 1]
        nxt = segments[i]
        speed_delta = abs(nxt["speed"] - prev["speed"])
        accelerations.append(speed_delta / max(nxt["dt"], 1))
        angle_delta = abs(nxt["angle"] - prev["angle"])
        direction_changes.append(min(angle_delta, 2 * math.pi - angle_delta))

    # 1. jerk: i >= 2 (즉 segments index 2 부터). core.js line 200-202.
    jerks: list[float] = []
    for i in range(2, len(segments)):
        prev_accel = accelerations[i - 2]
        curr_accel = accelerations[i - 1]
        nxt_dt = segments[i]["dt"]
        jerks.append(abs(curr_accel - prev_accel) / max(nxt_dt, 1))
    if jerks:
        out["mouse_jerk_mean"] = round(mean(jerks), 6)

    # 2. straightness: distance(moves[0], moves[-1]) / totalTravel. core.js line 209-210.
    total_travel = sum(s["dist"] for s in segments)
    if len(moves) >= 2 and total_travel > 0:
        first, last = moves[0], moves[-1]
        direct = math.hypot(last["x"] - first["x"], last["y"] - first["y"])
        out["mouse_path_straightness_score"] = round(direct / total_travel, 6)

    # 3. direction_change_count: > pi/6 인 개수. core.js line 221.
    out["mouse_direction_change_count"] = sum(
        1 for c in direction_changes if c > DIRECTION_CHANGE_THRESHOLD_RAD
    )

    # 4-7. pre_click_path 300/500. core.js summarizePath (line 96-109) + line 303-304.
    if clicks:
        latest_click_ts = float(clicks[-1]["ts_ms"])
        for window in PRE_CLICK_WINDOWS_MS:
            # core.js: subset = moves.filter(m => endTs - m.ts <= windowMs)
            #   → move.ts >= endTs - windowMs (음수 차이 = post-click move 도 포함, 정본 그대로)
            subset = [
                m for m in moves
                if (latest_click_ts - float(m["ts_ms"])) <= window
            ]
            if len(subset) < 2:
                continue
            total_dist = 0.0
            for i in range(1, len(subset)):
                a, b = subset[i - 1], subset[i]
                total_dist += math.hypot(b["x"] - a["x"], b["y"] - a["y"])
            direct = math.hypot(
                subset[-1]["x"] - subset[0]["x"],
                subset[-1]["y"] - subset[0]["y"],
            )
            straightness = (direct / total_dist) if total_dist > 0 else 0.0
            out[f"pre_click_path_{window}ms_total_distance_px"] = round(total_dist, 3)
            out[f"pre_click_path_{window}ms_straightness"] = round(straightness, 6)

    return out


# === I/O ===

def augment_trial_file(path: Path, dry_run: bool) -> tuple[dict, dict]:
    """trial 파일 1개 augment. 반환: (변환 전 metrics 7개, 변환 후 metrics 7개)."""
    with open(path, "r", encoding="utf-8") as f:
        trial = json.load(f)

    events = trial.get("eventRows", [])
    metrics = trial.setdefault("metrics", {})

    before = {key: metrics.get(key) for key in AUGMENT_KEYS}
    augmented = compute_augmented_metrics(events)

    for key in AUGMENT_KEYS:
        metrics[key] = augmented[key]

    if not dry_run:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(trial, f, ensure_ascii=False, indent=2)

    return before, augmented


def integrity_spot_check(path: Path) -> tuple[bool, str]:
    """변환 전 summary/eventRows 의 hash 를 기억해뒀다가 변환 후 비교.

    (변환을 실제로 하지 않고 검증만; main 에서 dry_run 후 사용)
    """
    import hashlib
    with open(path, "r", encoding="utf-8") as f:
        trial = json.load(f)
    summary = trial.get("summary", {})
    events = trial.get("eventRows", [])
    summary_hash = hashlib.md5(json.dumps(summary, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()
    events_hash = hashlib.md5(json.dumps(events, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()
    return True, f"summary_md5={summary_hash[:8]} eventRows_md5={events_hash[:8]}"


def format_value(v) -> str:
    if v is None:
        return "None"
    if isinstance(v, float):
        return f"{v:.6g}"
    return str(v)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Balabit trial.json metrics 후처리 (mouse 7 feature 추가, Phase A Step 1)"
    )
    parser.add_argument(
        "--data-dir", type=Path, default=None,
        help="기본 services/ai/data/behavior",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="파일 안 쓰고 계산 결과만 출력",
    )
    parser.add_argument(
        "--sample-n", type=int, default=5,
        help="무작위 샘플 출력 trial 수 (기본 5)",
    )
    parser.add_argument(
        "--seed", type=int, default=42,
        help="샘플 추출 seed (기본 42)",
    )
    args = parser.parse_args()

    ai_root = Path(__file__).resolve().parents[3]
    data_dir = args.data_dir or (ai_root / "data" / "behavior")
    if not data_dir.exists():
        print(f"[error] data_dir 없음: {data_dir}")
        return 1

    paths = sorted(data_dir.glob(TRIAL_GLOB))
    if not paths:
        print(f"[error] {TRIAL_GLOB} 매칭 파일 없음 in {data_dir}")
        return 1

    print(f"data_dir: {data_dir}")
    print(f"target trials: {len(paths)} ({TRIAL_GLOB})")
    print(f"dry_run={args.dry_run}, sample_n={args.sample_n}, seed={args.seed}")
    print()

    # 무결성 spot check 대상 (첫 trial)
    first_path = paths[0]
    pre_ok, pre_hash = integrity_spot_check(first_path)
    print(f"[integrity baseline] {first_path.name}: {pre_hash}")

    # 변환 진행
    null_counts: dict[str, int] = {key: 0 for key in AUGMENT_KEYS}
    written = 0
    errors: list[tuple[Path, Exception]] = []
    sample_records: list[tuple[str, dict, dict]] = []  # (name, before, after)

    import random
    rng = random.Random(args.seed)
    sample_indices = set(rng.sample(range(len(paths)), min(args.sample_n, len(paths))))

    for idx, path in enumerate(paths):
        try:
            before, after = augment_trial_file(path, args.dry_run)
        except Exception as e:
            errors.append((path, e))
            continue
        for key in AUGMENT_KEYS:
            if after[key] is None:
                null_counts[key] += 1
        if idx in sample_indices:
            sample_records.append((path.name, before, after))
        written += 1

    # 무결성 재확인 (변환 후)
    post_ok, post_hash = integrity_spot_check(first_path)
    integrity_match = (pre_hash == post_hash)
    print(f"[integrity post]     {first_path.name}: {post_hash}")
    print(f"[integrity result]   summary/eventRows {'unchanged ✓' if integrity_match else 'CHANGED ✗'}")
    print()

    # 샘플 출력
    print(f"=== Sample {len(sample_records)} trials (seed={args.seed}) ===")
    for name, before, after in sample_records:
        print(f"--- {name} ---")
        for key in AUGMENT_KEYS:
            mark = "" if before[key] == after[key] else "  *"
            print(f"  {key}: {format_value(before[key])} -> {format_value(after[key])}{mark}")
    print()

    # null 비율 표
    print(f"=== Null counts (n={written}) ===")
    print(f"{'feature':<48} {'null':>6} {'ratio':>8}")
    for key in AUGMENT_KEYS:
        n_null = null_counts[key]
        ratio = (n_null / written) if written else 0.0
        print(f"{key:<48} {n_null:>6} {ratio:>7.2%}")
    print()

    # 결과 요약
    print("=== Summary ===")
    print(f"  processed:  {written}")
    print(f"  errors:     {len(errors)}")
    print(f"  dry_run:    {args.dry_run}")
    if errors:
        for path, e in errors[:5]:
            print(f"    [error] {path.name}: {type(e).__name__}: {e}")

    return 0 if not errors else 2


if __name__ == "__main__":
    raise SystemExit(main())
