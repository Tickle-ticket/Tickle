"""jsonl 세션 파일 → trial.json (44 feature 명세 호환) 변환기.

용도: ML 매크로 분류 모델 학습용 데이터셋 생성 (mouse_automation_lv2 파이프라인).
- 입력: data/raw/{macro|human}/*.jsonl  (lv2_collector / human_recorder 산출물)
- 출력: data/behavior/trial_{N}.json    (chan EDA / HGBC 노트북 호환)

설계 결정 (plan ml-cheeky-squirrel.md D6, 2026-04-27 확정):
- mouse_automation 은 OS-level → DOM/keyboard feature 28개는 null
- 추출 16개 (1차 8 + 2차 8). 정의는 chan/browser_automation core.js 와 일치.
  예외 1개: mouse_hover_dwell_time_ms 는 DOM 부재로 OS-level 대체 정의 사용
  → summary.metrics_compatibility 에 명시 (silent 단위 충돌 방지).
- collection_pipeline = "mouse_automation_lv2" 메타로 미래 격리 안전장치
- trial_id 자연 격리: 보겸 = 900001, 찬혁 = 1번대 (서로 다른 머신, gitignore)

실행 (cwd = services/ai/):
    python -m macro.mouse_automation.analysis.jsonl_to_trial --start 900001 --dry-run
    python -m macro.mouse_automation.analysis.jsonl_to_trial --start 900001
    python -m macro.mouse_automation.analysis.jsonl_to_trial --start 900001 --label-filter macro
"""
import argparse
import json
import math
from pathlib import Path
from statistics import mean

import yaml


COLLECTION_PIPELINE = "mouse_automation_lv2"

# === 추출 대상 feature ===

# 1차 (확실, 트리비얼 위험 낮음): 8개
# ⚠️ time_to_first_click_ms 는 dry run 검증에서 트리비얼 의심 발견 (사람 jsonl 첫 줄 = 트리거
#    클릭이라 ts_ms ≈ 0, 매크로 = 첫 mouse_move 후 클릭이라 양수). 1차 유지하되 EDA 단독 분리
#    99%+ 시 학습 제외 (Q3 정책). 계산 부분 주석 참조.
TIER1_FEATURES = [
    "time_to_first_click_ms",
    "inter_click_interval_ms",
    "mouse_total_travel_distance_px",
    "mouse_avg_speed_px_per_ms",
    "mouse_max_speed_px_per_ms",
    "mouse_acceleration_mean",
    "mouse_jerk_mean",
    "mouse_direction_change_count",
]

# 2차 (트리비얼 위험 표시 — EDA 단독 분리 99%+ 시 학습 제외 정책): 8개
TIER2_FEATURES = [
    "mouse_speed_change_mean",
    "mouse_path_straightness_score",
    "mouse_path_curvature_mean",
    "mousemove_event_rate",
    "mouse_stop_segment_count",
    "mouse_hover_dwell_time_ms",   # OS-level 대체 정의 (chan = DOM hover)
    "pre_click_mousemove_count",
    "mouse_overshoot_flag",
]

EXTRACTABLE_FEATURES = TIER1_FEATURES + TIER2_FEATURES  # 16개

# === chan core.js 일치 임계값 ===

# stop_segment 조건 (core.js line 206): dt >= 120ms OR speed < 0.02 px/ms
STOP_DT_THRESHOLD_MS = 120
STOP_SPEED_THRESHOLD = 0.02

# direction_change_count 임계 (core.js line 221): π/6 (30도)
DIRECTION_CHANGE_RAD = math.pi / 6

# overshoot 조건 (core.js line 223-232):
# 직전 OVERSHOOT_WINDOW_MS 이내 mouse_move 중
#   minDistance < OVERSHOOT_MIN_DIST AND
#   afterMin_max - minDistance > OVERSHOOT_BOUNCE_DELTA
OVERSHOOT_WINDOW_MS = 500
OVERSHOOT_MIN_DIST = 12
OVERSHOOT_BOUNCE_DELTA = 24


def load_jsonl(path: Path) -> list[dict]:
    events: list[dict] = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                events.append(json.loads(line))
    return events


def load_feature_names(yaml_path: Path) -> list[str]:
    """feature_config.yaml 의 모든 feature (44개) 이름 로드."""
    with open(yaml_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    return [feature for group in cfg["groups"].values() for feature in group]


def _angle(dx: float, dy: float) -> float:
    return math.atan2(dy, dx)


def _build_segments(moves: list[dict]) -> list[dict]:
    """jsonl mouse_move → segment 리스트 (chan core.js moveSegments 와 동일 구조).

    ⚠️ jsonl 첫 mouse_move 는 dx/dy/dt_ms/speed 가 없어 segment 카운트에서 제외됨.
       chan 대비 segment 1개 적음 — 모든 segment-wise 통계가 그만큼 살짝 다를 수 있음.
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


def extract_metrics(events: list[dict], all_features: list[str]) -> dict:
    """44개 feature 키 dict 반환. 추출 가능한 16개만 값, 나머지 None.

    정의는 chan/browser_automation simulator/src/tracking/core.js 와 일치.
    예외 1개: mouse_hover_dwell_time_ms 는 DOM 부재로 OS-level 대체 정의 사용.

    ⚠️ jsonl 첫 mouse_move 는 dx/dy/dt_ms/speed 없어 segment 에서 제외됨
       (_build_segments 참조). chan 대비 segment 1개 적음.
    """
    metrics: dict = {f: None for f in all_features}

    if not events:
        return metrics

    moves = [e for e in events if e.get("event") == "mouse_move"]
    clicks = [e for e in events if e.get("event") == "mouse_click"]

    segments = _build_segments(moves)

    duration_ms = float(events[-1]["ts_ms"]) - float(events[0]["ts_ms"])

    # === 1차 8개 ===

    # 1. time_to_first_click_ms
    # ⚠️ 트리비얼 위험: human_recorder 는 첫 click 이 녹화 트리거라 jsonl 첫 줄 = mouse_click
    # → ts_ms ≈ 0 거의 보장. lv2_collector 는 첫 mouse_move 후 첫 클릭 → 양수.
    # 사실상 "사람 ≈ 0, 매크로 양수" 단독 분리 가능. EDA 분리 확인 후 학습 제외 판단 필수.
    if clicks:
        metrics["time_to_first_click_ms"] = round(float(clicks[0]["ts_ms"]), 3)

    # 2. inter_click_interval_ms
    if len(clicks) >= 2:
        intervals = [
            float(clicks[i + 1]["ts_ms"]) - float(clicks[i]["ts_ms"])
            for i in range(len(clicks) - 1)
        ]
        metrics["inter_click_interval_ms"] = round(mean(intervals), 3)

    # 3. mouse_total_travel_distance_px = Σ segment.dist
    total_travel = sum(s["dist"] for s in segments)
    metrics["mouse_total_travel_distance_px"] = round(total_travel, 3)

    # 4. mouse_avg_speed_px_per_ms = total_travel / duration_ms
    if duration_ms > 0:
        metrics["mouse_avg_speed_px_per_ms"] = round(total_travel / duration_ms, 6)

    # 5. mouse_max_speed_px_per_ms = max(segment.speed)
    if segments:
        metrics["mouse_max_speed_px_per_ms"] = round(max(s["speed"] for s in segments), 6)

    # === 6, 7, 8, 9, 11 — segment 간 변화 한 번에 ===
    speed_changes: list[float] = []
    accelerations: list[float] = []
    jerks: list[float] = []
    direction_changes: list[float] = []   # |Δθ| (rad). 8/11 둘 다에서 사용
    next_segments: list[dict] = []        # change[i] 가 발생한 다음 segment (curvature 의 span)

    for i in range(1, len(segments)):
        prev = segments[i - 1]
        nxt = segments[i]
        speed_delta = abs(nxt["speed"] - prev["speed"])
        speed_changes.append(speed_delta)
        accel = speed_delta / max(nxt["dt"], 1)
        accelerations.append(accel)
        if i > 1:
            prev_accel = accelerations[i - 2]
            jerks.append(abs(accel - prev_accel) / max(nxt["dt"], 1))
        angle_delta = abs(nxt["angle"] - prev["angle"])
        direction_changes.append(min(angle_delta, 2 * math.pi - angle_delta))
        next_segments.append(nxt)

    # 6. mouse_acceleration_mean
    if accelerations:
        metrics["mouse_acceleration_mean"] = round(mean(accelerations), 6)

    # 7. mouse_jerk_mean
    if jerks:
        metrics["mouse_jerk_mean"] = round(mean(jerks), 6)

    # 8. mouse_direction_change_count = count(|Δθ| > π/6)
    metrics["mouse_direction_change_count"] = sum(
        1 for c in direction_changes if c > DIRECTION_CHANGE_RAD
    )

    # === 2차 8개 ===

    # 9. mouse_speed_change_mean = mean(|Δspeed|)
    if speed_changes:
        metrics["mouse_speed_change_mean"] = round(mean(speed_changes), 6)

    # 10. mouse_path_straightness_score = 직선거리 / total_travel
    if len(moves) >= 2 and total_travel > 0:
        first = moves[0]
        last = moves[-1]
        straight_dist = math.sqrt(
            (last["x"] - first["x"]) ** 2 + (last["y"] - first["y"]) ** 2
        )
        metrics["mouse_path_straightness_score"] = round(straight_dist / total_travel, 6)

    # 11. mouse_path_curvature_mean = mean(Δθ_i / next_segments[i].dist)
    # chan core.js line 211-219 일치 (segment-wise ratio 평균, rad/px)
    if direction_changes:
        curvatures = [
            direction_changes[i] / max(next_segments[i]["dist"], 1)
            for i in range(len(direction_changes))
        ]
        metrics["mouse_path_curvature_mean"] = round(mean(curvatures), 6)

    # 12. mousemove_event_rate = moves.length / (duration_ms / 1000)
    if duration_ms > 0:
        metrics["mousemove_event_rate"] = round(len(moves) * 1000.0 / duration_ms, 3)

    # 13. mouse_stop_segment_count
    # chan core.js line 192, 206 일치 (segment-wise count, 구간 묶음 X)
    stop_count = 0
    stop_segment_dts: list[float] = []   # 14번에서 재사용
    for s in segments:
        if s["dt"] >= STOP_DT_THRESHOLD_MS or s["speed"] < STOP_SPEED_THRESHOLD:
            stop_count += 1
            stop_segment_dts.append(s["dt"])
    metrics["mouse_stop_segment_count"] = stop_count

    # 14. mouse_hover_dwell_time_ms — ⚠️ OS-level 대체 정의 + 트리비얼 위험
    # chan: hoverSamples (DOM element 위 머묾) 의 평균 duration
    # 우리: DOM 없음 → "stop segment 들의 평균 dt" 로 대체
    # 정의 다름 → summary.metrics_compatibility = "os_level_substitute" 로 명시
    #
    # ⚠️ 트리비얼 위험: stop_segment 조건이 dt >= 120ms OR speed < 0.02 라
    # stop 으로 잡힌 segment 의 dt 거의 항상 120ms 이상 (조건 자체가 그래서 잡힘).
    # - 매크로 (베지어 step 균등): stop 거의 발생 X → null/빈약한 샘플
    # - 사람: 자연 멈춤 → 풍부한 샘플
    # 대체 정의 자체가 단독 분리 99%+ 가능성. EDA 분리 확인 필수.
    if stop_segment_dts:
        metrics["mouse_hover_dwell_time_ms"] = round(mean(stop_segment_dts), 3)

    # 15. pre_click_mousemove_count = 클릭 직전 연속 mouse_move 개수 평균
    counts: list[int] = []
    last_click_idx = -1
    for i, e in enumerate(events):
        if e.get("event") != "mouse_click":
            continue
        c = 0
        j = i - 1
        while j > last_click_idx:
            if events[j].get("event") != "mouse_move":
                break
            c += 1
            j -= 1
        counts.append(c)
        last_click_idx = i
    if counts:
        metrics["pre_click_mousemove_count"] = round(mean(counts), 3)

    # 16. mouse_overshoot_flag — 0/1 (chan core.js line 223-232 일치)
    # ⚠️ 트리비얼 위험: chan 의 click.targetCenterX/Y 는 DOM 요소 중심
    # (사람도 정확한 한가운데 못 찍어 minDistance > 0).
    # 우리는 DOM 부재로 click.x/y 사용 → minDistance ≈ 0 거의 보장 →
    # 사실상 "직전 500ms 안에 24px 이상 움직였나" 가 됨.
    # 매크로 (베지어 단조 접근) = 작음, 사람 = 자연 큼 → 단독 분리 99%+ 가능성.
    # EDA 분리 확인 후 학습 제외 판단 필수.
    overshoot_flag = 0
    for c in clicks:
        target_x = c.get("x")
        target_y = c.get("y")
        click_ts = c.get("ts_ms")
        if target_x is None or target_y is None or click_ts is None:
            continue
        pre_moves = [
            m for m in moves
            if m.get("ts_ms") is not None
            and 0 <= (click_ts - m["ts_ms"]) <= OVERSHOOT_WINDOW_MS
        ]
        if len(pre_moves) < 3:
            continue
        distances = [
            math.sqrt((m["x"] - target_x) ** 2 + (m["y"] - target_y) ** 2)
            for m in pre_moves
        ]
        min_distance = min(distances)
        min_index = distances.index(min_distance)
        after_min_max = max(distances[min_index:])
        if (
            min_distance < OVERSHOOT_MIN_DIST
            and (after_min_max - min_distance) > OVERSHOOT_BOUNCE_DELTA
        ):
            overshoot_flag = 1
            break
    metrics["mouse_overshoot_flag"] = overshoot_flag

    return metrics


def build_summary(events: list[dict], session_id: str, source: str) -> dict:
    duration_ms = (events[-1]["ts_ms"] - events[0]["ts_ms"]) if events else 0.0
    click_count = sum(1 for e in events if e.get("event") == "mouse_click")
    return {
        "collection_pipeline": COLLECTION_PIPELINE,
        "session_id": session_id,
        "source": source,
        "durationMs": round(float(duration_ms), 3),
        "clickCount": click_count,
        "eventCount": len(events),
        # OS-level vs chan/browser_automation 정의 호환성 메타.
        # 정의가 다른 metric 만 명시 (silent 단위 충돌 방지).
        "metrics_compatibility": {
            "mouse_hover_dwell_time_ms": "os_level_substitute",
        },
    }


def jsonl_to_trial(
    jsonl_path: Path,
    trial_id: int,
    all_features: list[str],
) -> dict | None:
    """jsonl 1개 → trial dict. 빈 파일/라벨 없음 시 None."""
    events = load_jsonl(jsonl_path)
    if not events:
        return None

    first = events[0]
    label = first.get("label")
    if label not in ("human", "macro"):
        return None

    source = first.get("source", "")
    session_id = first.get("session_id", jsonl_path.stem)

    # eventRows clean: label/session_id/source 는 summary 중복 → 제거
    drop_keys = ("label", "session_id", "source")
    event_rows = [
        {k: v for k, v in e.items() if k not in drop_keys}
        for e in events
    ]

    return {
        "trialId": trial_id,
        "label": label,
        "summary": build_summary(events, session_id, source),
        "metrics": extract_metrics(events, all_features),
        "eventRows": event_rows,
    }


def main():
    parser = argparse.ArgumentParser(
        description="jsonl → trial.json 변환 (mouse_automation_lv2 파이프라인)"
    )
    parser.add_argument(
        "--start",
        type=int,
        default=900001,
        help="trial_id 시작값 (보겸 기본 900001, 찬혁 1번대와 자연 격리)",
    )
    parser.add_argument(
        "--label-filter",
        choices=["macro", "human"],
        default=None,
        help="특정 라벨만 변환 (기본 둘 다)",
    )
    parser.add_argument("--input-dir", type=Path, default=None, help="기본 data/raw/")
    parser.add_argument("--output-dir", type=Path, default=None, help="기본 data/behavior/")
    parser.add_argument("--config", type=Path, default=None, help="feature_config.yaml 경로")
    parser.add_argument("--dry-run", action="store_true", help="파일 안 쓰고 카운트만")
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="기존 trial 파일 덮어쓰기 허용 (기본 skip)",
    )
    args = parser.parse_args()

    ai_root = Path(__file__).resolve().parents[3]
    input_dir = args.input_dir or (ai_root / "data" / "raw")
    output_dir = args.output_dir or (ai_root / "data" / "behavior")
    config_path = args.config or (ai_root / "configs" / "feature_config.yaml")

    if not config_path.exists():
        print(f"feature_config.yaml 없음: {config_path}")
        return

    all_features = load_feature_names(config_path)
    if len(all_features) != 44:
        print(f"⚠️ feature_config 의 feature 수 {len(all_features)} (예상 44)")

    label_dirs = [args.label_filter] if args.label_filter else ["macro", "human"]
    jsonl_files: list[Path] = []
    for lbl in label_dirs:
        d = input_dir / lbl
        if d.exists():
            jsonl_files.extend(sorted(d.glob("*.jsonl")))

    if not jsonl_files:
        print(f"입력 파일 없음: {input_dir}")
        return

    print(f"입력 파일 수: {len(jsonl_files)}")
    print(f"출력 폴더: {output_dir}")
    print(f"trial_id 시작: {args.start}")
    print(f"dry-run: {args.dry_run}")

    if not args.dry_run:
        output_dir.mkdir(parents=True, exist_ok=True)

    converted = 0
    skipped_empty = 0
    skipped_no_label = 0
    skipped_exists = 0
    next_id = args.start

    for path in jsonl_files:
        trial = jsonl_to_trial(path, next_id, all_features)
        if trial is None:
            events = load_jsonl(path)
            if not events:
                skipped_empty += 1
                print(f"  [skip] {path.name}: empty")
            else:
                skipped_no_label += 1
                print(f"  [skip] {path.name}: no label")
            continue

        out_path = output_dir / f"trial_{next_id}.json"
        if out_path.exists() and not args.overwrite:
            print(f"  [skip] {out_path.name}: exists (use --overwrite)")
            skipped_exists += 1
            next_id += 1
            continue

        if not args.dry_run:
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(trial, f, ensure_ascii=False, indent=2)

        non_null = sum(1 for v in trial["metrics"].values() if v is not None)
        tag = "dry" if args.dry_run else "ok "
        print(
            f"  [{tag}] {path.name} -> {out_path.name} "
            f"(label={trial['label']}, events={trial['summary']['eventCount']}, "
            f"clicks={trial['summary']['clickCount']}, metrics={non_null}/44)"
        )
        converted += 1
        next_id += 1

    print("=== 결과 ===")
    print(f"  변환: {converted}")
    print(f"  스킵 (빈 파일): {skipped_empty}")
    print(f"  스킵 (라벨 없음): {skipped_no_label}")
    print(f"  스킵 (이미 존재): {skipped_exists}")
    if converted > 0:
        print(f"  trial_id 범위: {args.start} ~ {next_id - 1}")


if __name__ == "__main__":
    main()
