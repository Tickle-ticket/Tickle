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


# === ADR-016 메타 backfill ===

# label → algorithm_type 매핑 (lv2_collector / human_recorder 산출 풀 한정, source 무관)
ALGORITHM_TYPE_BY_LABEL = {
    "human": "human_lv2_collector",
    "macro": "lv2_bezier",
}


def resolve_algorithm_type(label: str | None, source: str) -> str | None:
    """label + source → algorithm_type. lv3_balabit_kde 는 source 로 식별.

    sidecar 가 algorithm_type 을 명시한 경우 caller 에서 sidecar 값이 우선,
    sidecar 없으면 본 함수가 fallback (source 자력 식별 포함).
    """
    if source == "pyautogui_lv3_balabit_kde_collector":
        return "lv3_balabit_kde"
    return ALGORITHM_TYPE_BY_LABEL.get(label)


def resolve_collection_pipeline(source: str) -> str:
    """source → collection_pipeline 메타. lv3_balabit_kde 는 격리된 풀."""
    if source == "pyautogui_lv3_balabit_kde_collector":
        return "mouse_automation_lv3_balabit_kde"
    return "mouse_automation_lv2"


# 정합성 제약: macro 라벨은 이 algorithm_type 집합에만 속해야 함
MACRO_ALGORITHM_TYPES = frozenset({
    "lv2_bezier",
    "lv3_random_walk",
    "lv3_balabit_kde",
    "support_production",  # ticket 319 phase 2.5: tickle-ticket.co.kr 타겟 production 매크로 (v1/v1b/v2a/v2b 합산)
    "lv4_aggressive",      # ticket 319 phase 3: 압도적 매크로 (직선 + fixed timing + 노이즈 0)
})

# user_id prefix ↔ algorithm_type 매핑 (정합성 검증용)
USER_PREFIX_BY_ALGORITHM = {
    "human_lv2_collector": "lv2_",
    "human_lv3_collector": "lv3_",
    "human_balabit": "balabit_",
    "lv3_balabit_kde": "balabit_kde_",
}

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

# 3차 (370 추가) — OS-level 에서 (x,y,t) 만으로 측정 가능한 11개.
# 7개는 chan core.js 정의와 동일, 4개는 OS-substitute (DOM element 부재로 대체 정의).
# 정책: click_sequence_consistency_score 는 OS-substitute 가 휴리스틱이라 제외 (보겸 결정 2026-05-11).
TIER3_FEATURES = [
    "pre_click_path_300ms_total_distance_px",  # core.js 동일
    "pre_click_path_300ms_straightness",       # core.js 동일
    "pre_click_path_500ms_total_distance_px",  # core.js 동일
    "pre_click_path_500ms_straightness",       # core.js 동일
    "pre_click_hover_time_ms",                 # OS-substitute (직전 500ms 마지막 stop-segment dt)
    "pre_click_scroll_flag",                   # core.js 동일. lv2/human/Balabit 모두 scroll 미기록 → 항상 null 가능
    "click_position_repeat_rate",              # core.js 동일
    "click_offset_variance_px",                # OS-substitute (centroid 까지 거리 분산)
    "double_click_rate",                       # OS-substitute (inter-click < 300ms 비율)
    "inter_element_move_interval_std_ms",      # OS-substitute (클릭 간 간격의 std)
    "edge_or_fixed_point_visit_rate",          # core.js 동일. screen_width 없으면 null
]

EXTRACTABLE_FEATURES = TIER1_FEATURES + TIER2_FEATURES + TIER3_FEATURES  # 27개

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

# TIER3 임계값 (chan core.js 일치)
PRE_CLICK_300_MS = 300
PRE_CLICK_500_MS = 500
PRE_CLICK_HOVER_WINDOW_MS = 500           # pre_click_hover_time_ms 의 lookback
DOUBLE_CLICK_MS = 300                     # OS-substitute: inter-click < 300ms 면 double click
CLICK_POSITION_REPEAT_TOL_PX = 6          # core.js line 149 와 동일
EDGE_PX_DEFAULT = 20                      # core.js line 263 와 동일


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


def _pre_click_path_stats(
    moves: list[dict],
    click_ts: float,
    window_ms: int,
) -> tuple[float | None, float | None]:
    """클릭 직전 window_ms 내 mouse_move 의 (total_distance, straightness).

    core.js summarizePath (line 96-109) 와 동일 정의:
    - total_distance = 인접 move 쌍의 (Δx, Δy) 합
    - straightness = (first→last 직선거리) / total_distance
    - move 가 2개 미만이면 (None, None) (caller 가 평균 집계 시 스킵)
    - total_distance = 0 인 경우 (좌표 변화 없음): (0.0, 0.0) 반환
    """
    window_moves = [
        m for m in moves
        if m.get("ts_ms") is not None and 0 <= (click_ts - m["ts_ms"]) <= window_ms
    ]
    if len(window_moves) < 2:
        return None, None
    total = 0.0
    for a, b in zip(window_moves, window_moves[1:]):
        dx = b["x"] - a["x"]
        dy = b["y"] - a["y"]
        total += math.sqrt(dx * dx + dy * dy)
    if total == 0:
        return 0.0, 0.0
    first, last = window_moves[0], window_moves[-1]
    straight = math.sqrt((last["x"] - first["x"]) ** 2 + (last["y"] - first["y"]) ** 2)
    return total, straight / total


def extract_metrics(
    events: list[dict],
    all_features: list[str],
    screen_width: int | None = None,
    screen_height: int | None = None,
) -> dict:
    """44개 feature 키 dict 반환. OS-level 가능 27개에 한해 값, 나머지 None.

    정의는 chan/browser_automation simulator/src/tracking/core.js 와 일치.
    예외 (OS-substitute): mouse_hover_dwell_time_ms, pre_click_hover_time_ms,
    click_offset_variance_px, double_click_rate, inter_element_move_interval_std_ms.

    screen_width/height 가 None 이면 edge_or_fixed_point_visit_rate 는 null.

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

    # === 3차 11개 (TIER3) ===

    # 17-20. pre_click_path_300/500ms_{total_distance_px, straightness}
    # core.js summarizePath (line 96-109) 와 동일 정의. _pre_click_path_stats 헬퍼 참조.
    total_300_list: list[float] = []
    straight_300_list: list[float] = []
    total_500_list: list[float] = []
    straight_500_list: list[float] = []
    for c in clicks:
        click_ts = c.get("ts_ms")
        if click_ts is None:
            continue
        t300, s300 = _pre_click_path_stats(moves, click_ts, PRE_CLICK_300_MS)
        if t300 is not None:
            total_300_list.append(t300)
            straight_300_list.append(s300)
        t500, s500 = _pre_click_path_stats(moves, click_ts, PRE_CLICK_500_MS)
        if t500 is not None:
            total_500_list.append(t500)
            straight_500_list.append(s500)
    if total_300_list:
        metrics["pre_click_path_300ms_total_distance_px"] = round(mean(total_300_list), 3)
        metrics["pre_click_path_300ms_straightness"] = round(mean(straight_300_list), 6)
    if total_500_list:
        metrics["pre_click_path_500ms_total_distance_px"] = round(mean(total_500_list), 3)
        metrics["pre_click_path_500ms_straightness"] = round(mean(straight_500_list), 6)

    # 21. pre_click_hover_time_ms — OS 대체 정의
    # 각 클릭 직전 PRE_CLICK_HOVER_WINDOW_MS 내 마지막 stop-segment 의 dt 평균.
    # stop-segment 정의는 13번 (mouse_stop_segment_count) 과 동일 (dt >= 120 OR speed < 0.02).
    # 단위 충돌 방지: chan 은 DOM hoverSample duration → metrics_compatibility 에 명시.
    stop_moves_ts_dt: list[tuple[float, float]] = []
    for m in moves:
        dt = m.get("dt_ms")
        speed = m.get("speed")
        ts = m.get("ts_ms")
        if dt is None or speed is None or ts is None:
            continue
        if dt >= STOP_DT_THRESHOLD_MS or speed < STOP_SPEED_THRESHOLD:
            stop_moves_ts_dt.append((float(ts), float(dt)))
    pre_click_hover_list: list[float] = []
    for c in clicks:
        click_ts = c.get("ts_ms")
        if click_ts is None:
            continue
        candidates = [
            (ts, dt) for ts, dt in stop_moves_ts_dt
            if 0 <= (click_ts - ts) <= PRE_CLICK_HOVER_WINDOW_MS
        ]
        if candidates:
            _, last_stop_dt = max(candidates, key=lambda x: x[0])
            pre_click_hover_list.append(last_stop_dt)
    if pre_click_hover_list:
        metrics["pre_click_hover_time_ms"] = round(mean(pre_click_hover_list), 3)

    # 22. pre_click_scroll_flag — core.js line 288 동일
    # ⚠️ lv2_collector / human_recorder / Balabit CSV 셋 다 mouse_scroll event 미기록.
    # 실측 (raw jsonl 10 + g1_human trial 5) 에서 scroll event 0건. 사실상 항상 null.
    # 방어적 구현: scroll event 가 있는 경우에만 계산 (compatibility 에 dataset_unavailable 마커).
    scrolls = [e for e in events if e.get("event") == "mouse_scroll"]
    if scrolls and clicks:
        flags: list[int] = []
        for c in clicks:
            click_ts = c.get("ts_ms")
            if click_ts is None:
                continue
            has_scroll = any(
                s.get("ts_ms") is not None
                and 0 <= (click_ts - s["ts_ms"]) <= PRE_CLICK_HOVER_WINDOW_MS
                for s in scrolls
            )
            flags.append(1 if has_scroll else 0)
        if flags:
            metrics["pre_click_scroll_flag"] = round(mean(flags), 6)

    # 23. click_position_repeat_rate (core.js line 148-150 동일)
    # 각 클릭 i: 이전 클릭 j 중 |x_i - x_j| <= 6 AND |y_i - y_j| <= 6 가 하나라도 있으면 카운트.
    if clicks:
        repeat_count = 0
        for i, c in enumerate(clicks):
            cx = c.get("x")
            cy = c.get("y")
            if cx is None or cy is None:
                continue
            for j in range(i):
                px = clicks[j].get("x")
                py = clicks[j].get("y")
                if px is None or py is None:
                    continue
                if (
                    abs(cx - px) <= CLICK_POSITION_REPEAT_TOL_PX
                    and abs(cy - py) <= CLICK_POSITION_REPEAT_TOL_PX
                ):
                    repeat_count += 1
                    break
        metrics["click_position_repeat_rate"] = round(repeat_count / len(clicks), 6)

    # 24. click_offset_variance_px — OS 대체 정의
    # chan: 클릭 좌표 - DOM element 중심 의 분산 (DOM 부재로 OS-level 불가)
    # 우리: 클릭 좌표들의 centroid 기준 거리의 분산
    if len(clicks) >= 2:
        coords = [
            (c["x"], c["y"]) for c in clicks
            if c.get("x") is not None and c.get("y") is not None
        ]
        if len(coords) >= 2:
            cx_mean = mean(x for x, _ in coords)
            cy_mean = mean(y for _, y in coords)
            dists = [
                math.sqrt((x - cx_mean) ** 2 + (y - cy_mean) ** 2)
                for x, y in coords
            ]
            d_mean = mean(dists)
            variance = mean((d - d_mean) ** 2 for d in dists)
            metrics["click_offset_variance_px"] = round(variance, 6)

    # 25. double_click_rate — OS 대체 정의
    # chan: native dblclick event 비율
    # 우리: inter-click-interval < 300ms 인 클릭 쌍의 비율 (각 빠른 쌍 1개로 카운트)
    if len(clicks) >= 2:
        intervals = [
            float(clicks[i + 1]["ts_ms"]) - float(clicks[i]["ts_ms"])
            for i in range(len(clicks) - 1)
        ]
        rapid = sum(1 for it in intervals if it < DOUBLE_CLICK_MS)
        metrics["double_click_rate"] = round(rapid / len(clicks), 6)

    # 26. inter_element_move_interval_std_ms — OS 대체 정의
    # chan: trackId 변화 시점 간 간격의 std (DOM track 단위, OS 부재로 불가)
    # 우리: inter-click-interval 의 std (OS 에서 "element 간 이동" 의 가장 가까운 대체)
    if len(clicks) >= 3:
        intervals = [
            float(clicks[i + 1]["ts_ms"]) - float(clicks[i]["ts_ms"])
            for i in range(len(clicks) - 1)
        ]
        m_int = mean(intervals)
        var = mean((it - m_int) ** 2 for it in intervals)
        metrics["inter_element_move_interval_std_ms"] = round(math.sqrt(var), 6)

    # 27. edge_or_fixed_point_visit_rate (core.js line 263 동일)
    # screen_width/height 가 모두 있을 때만 계산. lv2_collector / Balabit 둘 다 None →
    # 항상 null 유지 (compatibility 에 screen_dim_missing 마커).
    if screen_width and screen_height and moves:
        edge_count = 0
        for m in moves:
            x = m.get("x")
            y = m.get("y")
            if x is None or y is None:
                continue
            if (
                x <= EDGE_PX_DEFAULT
                or x >= screen_width - EDGE_PX_DEFAULT
                or y <= EDGE_PX_DEFAULT
                or y >= screen_height - EDGE_PX_DEFAULT
            ):
                edge_count += 1
        metrics["edge_or_fixed_point_visit_rate"] = round(edge_count / len(moves), 6)

    return metrics


# OS-level (mouse_automation_lv2 + external_balabit) 에서 원리상 / 인프라상 채울 수 없는 feature 리스트.
# - dom_feature_unavailable: DOM element 정보 부재 → 6개 click feature 산출 불가
# - click_sequence_consistency_score: OS-substitute 정의가 휴리스틱이라 산출 보류 (보겸 결정 2026-05-11)
DOM_FEATURE_UNAVAILABLE = [
    "time_from_element_visible_to_click_ms",
    "time_from_element_clickable_to_click_ms",
    "click_offset_from_element_center_px",
    "misclick_rate",
    "reclick_rate",
    "immediate_post_render_click_rate",
    "click_sequence_consistency_score",
]

# OS-level 에서 chan core.js 와 정의가 다른 metric (silent 단위 충돌 방지).
OS_LEVEL_SUBSTITUTES = {
    "mouse_hover_dwell_time_ms": "os_level_substitute",       # chan = DOM hoverSample
    "pre_click_hover_time_ms": "os_level_substitute",          # chan = DOM hoverSample
    "click_offset_variance_px": "os_level_substitute",         # chan = element center 기준
    "double_click_rate": "os_level_substitute",                # chan = native dblclick
    "inter_element_move_interval_std_ms": "os_level_substitute",  # chan = trackId 단위
}


def build_summary(events: list[dict], session_id: str, source: str) -> dict:
    duration_ms = (events[-1]["ts_ms"] - events[0]["ts_ms"]) if events else 0.0
    click_count = sum(1 for e in events if e.get("event") == "mouse_click")
    # lv2_collector / human_recorder 는 mouse_scroll event 미기록 (raw jsonl 실측 0건)
    # → pre_click_scroll_flag 는 항상 null (dataset_unavailable)
    # screen_width/height 가 trial root 에서 None → edge_or_fixed_point_visit_rate 도 null
    # (이 두 마커는 jsonl_to_trial 풀 일괄 적용. balabit_to_trial 도 동일 패턴 사용)
    return {
        "collection_pipeline": resolve_collection_pipeline(source),
        "session_id": session_id,
        "source": source,
        "durationMs": round(float(duration_ms), 3),
        "clickCount": click_count,
        "eventCount": len(events),
        "metrics_compatibility": {
            "dom_feature_unavailable": list(DOM_FEATURE_UNAVAILABLE),
            **OS_LEVEL_SUBSTITUTES,
            "pre_click_scroll_flag": "dataset_unavailable",
            "edge_or_fixed_point_visit_rate": "screen_dim_missing",
        },
    }


def _add_nx_ny(
    row: dict,
    screen_width: int | None,
    screen_height: int | None,
) -> dict:
    """mouse_* 이벤트에 nx, ny 키 부여. screen_* null 이면 null. key_* 이벤트는 좌표 없어 추가 안 함.

    nx/ny 는 [0, 1] 범위 비보장 — 멀티모니터 음수 / viewport 외부 좌표는 그대로 정규화.
    """
    if not str(row.get("event", "")).startswith("mouse"):
        return row

    x = row.get("x")
    y = row.get("y")
    if x is None or y is None or not screen_width or not screen_height:
        nx, ny = None, None
    else:
        nx = x / screen_width
        ny = y / screen_height

    out = dict(row)
    out["nx"] = nx
    out["ny"] = ny
    return out


def validate_meta(trial: dict) -> list[str]:
    """ADR-016 정합성 제약 검증. 위반 시 warning 메시지 리스트 반환 (raise X)."""
    warnings: list[str] = []
    label = trial.get("label")
    algo = trial.get("algorithm_type")
    user_id = trial.get("user_id")

    if label == "macro" and algo not in MACRO_ALGORITHM_TYPES:
        warnings.append(
            f"label=macro but algorithm_type={algo!r} not in {sorted(MACRO_ALGORITHM_TYPES)}"
        )
    if label == "human" and user_id is None:
        warnings.append("label=human but user_id is null")

    if algo == "lv3_balabit_kde" and user_id is None:
        warnings.append("algorithm_type=lv3_balabit_kde but user_id is null (sidecar missing?)")

    if user_id is not None:
        expected_prefix = USER_PREFIX_BY_ALGORITHM.get(algo)
        if expected_prefix and not str(user_id).startswith(expected_prefix):
            warnings.append(
                f"algorithm_type={algo!r} but user_id={user_id!r} (expected prefix {expected_prefix!r})"
            )

    return warnings


def _sidecar_path(jsonl_path: Path) -> Path:
    """jsonl 옆 sidecar manifest 경로 ({stem}.meta.json)."""
    return jsonl_path.with_suffix(".meta.json")


def _read_sidecar(jsonl_path: Path) -> dict | None:
    """sidecar 가 있으면 dict, 없거나 파싱 실패 시 None (warn 출력)."""
    p = _sidecar_path(jsonl_path)
    if not p.exists():
        return None
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(f"  [warn] sidecar parse fail {p.name}: {e}")
        return None


def jsonl_to_trial(
    jsonl_path: Path,
    trial_id: int,
    all_features: list[str],
    user_id_for_human: str = "lv2_001",
    algorithm_type_override: str | None = None,
) -> dict | None:
    """jsonl 1개 → trial dict. 빈 파일/라벨 없음 시 None.

    ADR-016 메타 backfill:
      - root: coord_domain, screen_width, screen_height, algorithm_type, user_id
      - eventRows[*]: nx, ny (mouse_* 이벤트만)

    algorithm_type_override (ticket 319 phase 2.5): sidecar 부재 시 sidecar 없이도
      algorithm_type 메타 명시 가능 (예: Support production 풀 일괄 'support_production').
      sidecar 가 있으면 sidecar 우선 (기존 동작 유지).
    """
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

    # 메타 (mouse_automation_lv2 풀 일괄)
    coord_domain = "os_screen"
    screen_width: int | None = None
    screen_height: int | None = None

    # sidecar manifest 우선 (lv3_balabit_kde 등 jsonl 에 user_id 가 박히지 않는 풀).
    # 없으면 기존 dict-fallback 동작 — lv2/human/balabit 풀 byte invariance.
    sidecar = _read_sidecar(jsonl_path)
    if sidecar is not None:
        sidecar_user_id = sidecar.get("user_id")
        sidecar_algo = sidecar.get("algorithm_type")
        sidecar_source = sidecar.get("source")

        if sidecar_source and sidecar_source != source:
            print(
                f"  [warn] {jsonl_path.name}: sidecar source={sidecar_source!r} "
                f"!= jsonl source={source!r}"
            )

        algorithm_type = sidecar_algo or resolve_algorithm_type(label, source)
        if label == "human":
            user_id = sidecar_user_id or user_id_for_human
        else:
            user_id = sidecar_user_id  # macro: sidecar 명시 X 면 None
    else:
        algorithm_type = algorithm_type_override or resolve_algorithm_type(label, source)
        user_id = user_id_for_human if label == "human" else None

    event_rows = [
        _add_nx_ny(
            {k: v for k, v in e.items() if k not in drop_keys},
            screen_width,
            screen_height,
        )
        for e in events
    ]

    trial = {
        "trialId": trial_id,
        "label": label,
        "coord_domain": coord_domain,
        "screen_width": screen_width,
        "screen_height": screen_height,
        "algorithm_type": algorithm_type,
        "user_id": user_id,
        "summary": build_summary(events, session_id, source),
        "metrics": extract_metrics(events, all_features, screen_width, screen_height),
        "eventRows": event_rows,
    }

    for w in validate_meta(trial):
        print(f"  [warn] trial_{trial_id}: {w}")

    return trial


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
    parser.add_argument(
        "--user-id",
        default="lv2_001",
        help="lv2_human (label=human) 의 user_id (기본 lv2_001, 보겸 단일 사용자 가정)",
    )
    parser.add_argument(
        "--algorithm-type",
        default=None,
        help=(
            "macro algorithm_type override (sidecar 부재 시 사용). "
            "MACRO_ALGORITHM_TYPES 집합 안의 값만 허용. "
            "예: 'support_production' (ticket 319 phase 2.5 Support 풀 일괄 변환)"
        ),
    )
    parser.add_argument(
        "--source-filter",
        default=None,
        help=(
            "jsonl 첫 줄 source 필드와 일치하는 파일만 변환. 미지정 시 전체. "
            "예: 'pyautogui_lv4_collector' (ticket 319 phase 3 lv4 만 선별 변환)"
        ),
    )
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

    if args.source_filter:
        before = len(jsonl_files)
        filtered: list[Path] = []
        for path in jsonl_files:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    first_line = f.readline().strip()
                if not first_line:
                    continue
                first = json.loads(first_line)
                if first.get("source") == args.source_filter:
                    filtered.append(path)
            except (OSError, json.JSONDecodeError):
                continue
        jsonl_files = filtered
        print(f"source filter '{args.source_filter}': {before} -> {len(jsonl_files)} files")
        if not jsonl_files:
            print("source filter 결과 0 — 변환 중단")
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
        trial = jsonl_to_trial(
            path,
            next_id,
            all_features,
            user_id_for_human=args.user_id,
            algorithm_type_override=args.algorithm_type,
        )
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
