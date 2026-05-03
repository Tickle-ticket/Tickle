"""Balabit Mouse Dynamics Challenge CSV -> trial.json (mouse_automation 호환) 변환기.

용도: 295 후속 - lv2_collector 기반 학습 데이터의 분포 다양성 보강.
- 입력: Balabit training_files/user{N}/session_* CSV (10 사용자, OS-level 마우스)
- 출력: services/ai/data/behavior/trial_91xxxx.json
        (모두 label="human", source="balabit_dataset", collection_pipeline="external_balabit")

설계 결정 (plan twinkling-sleeping-pumpkin.md, 2026-04-29 사용자 승인):
- 7 feature 만 산출 (xgboost_gyeom 학습용). 나머지 37개는 null.
- 7 feature 식은 stash@{0}^3 의 jsonl_to_trial.py 에서 vendored (단일 출처).
- collection_pipeline = "external_balabit" (lv2 = "mouse_automation_lv2" 와 분리)
- trial_id 910001+ (lv2 = 900001+, 찬혁 1번대와 자연 격리)
- chunk_size=300 (lv2 평균 eventCount 와 매치)
- max_chunks_per_user=50 (사용자별 균등 분배 + 무작위 샘플링, seed=42 결정성)

state 매핑 (Balabit CSV 분포 분석 결과 기반):
- Pressed + (Left/Right/Middle) -> mouse_click
- Move, Drag                    -> mouse_move (Drag 도 좌표 변화 신호 -> 분포 보강)
- Released, Down, Up            -> drop (Released 는 click 부풀림 방지, Down/Up 은 휠 스크롤)

실행 (cwd = services/ai/):
    python -m macro.mouse_automation.analysis.balabit_to_trial --dry-run
    python -m macro.mouse_automation.analysis.balabit_to_trial
    python -m macro.mouse_automation.analysis.balabit_to_trial --user-filter user7
"""
from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path
from statistics import mean

import pandas as pd
import yaml

from macro.mouse_automation.analysis.jsonl_to_trial import (
    _add_nx_ny,
    validate_meta,
)


# === 7 feature 계산식 (vendored) ===
# 출처: stash@{0}^3 services/ai/macro/mouse_automation/analysis/jsonl_to_trial.py
# 정본 단일 출처: 144 의 jsonl_to_trial.py (현재 미커밋, ai-feat-294 stash)
# TODO(refactor): 144 머지 시 본 인라인 블록 제거하고
#                 from .jsonl_to_trial import extract_metrics 직접 호출로 교체.

def _angle(dx: float, dy: float) -> float:
    return math.atan2(dy, dx)


def _build_segments(moves: list[dict]) -> list[dict]:
    """mouse_move 이벤트 리스트 -> segment 리스트.

    chunk 의 첫 mouse_move 는 dx/dy/dt_ms/speed 가 없어 segment 카운트에서 제외됨
    (chan core.js 대비 segment 1개 적음 - 의도된 trade-off, lv2 와 동일).
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


def extract_seven_features(events: list[dict]) -> dict:
    """우리 학습 7 feature 산출.

    호출측이 events 의 mouse_move 항목에 사전계산된 dx/dy/dt_ms/speed 를
    EventLogger 와 동일 형식으로 박아넣어야 함 (compute_deltas 참조).
    """
    out = {
        "inter_click_interval_ms": None,
        "mouse_total_travel_distance_px": None,
        "mouse_avg_speed_px_per_ms": None,
        "mouse_max_speed_px_per_ms": None,
        "mouse_speed_change_mean": None,
        "mouse_acceleration_mean": None,
        "mouse_path_curvature_mean": None,
    }
    if not events:
        return out

    moves = [e for e in events if e.get("event") == "mouse_move"]
    clicks = [e for e in events if e.get("event") == "mouse_click"]
    segments = _build_segments(moves)
    duration_ms = float(events[-1]["ts_ms"]) - float(events[0]["ts_ms"])

    if len(clicks) >= 2:
        intervals = [
            float(clicks[i + 1]["ts_ms"]) - float(clicks[i]["ts_ms"])
            for i in range(len(clicks) - 1)
        ]
        out["inter_click_interval_ms"] = round(mean(intervals), 3)

    total_travel = sum(s["dist"] for s in segments)
    out["mouse_total_travel_distance_px"] = round(total_travel, 3)

    if duration_ms > 0:
        out["mouse_avg_speed_px_per_ms"] = round(total_travel / duration_ms, 6)

    if segments:
        out["mouse_max_speed_px_per_ms"] = round(max(s["speed"] for s in segments), 6)

    speed_changes: list[float] = []
    accelerations: list[float] = []
    direction_changes: list[float] = []
    next_segments: list[dict] = []
    for i in range(1, len(segments)):
        prev = segments[i - 1]
        nxt = segments[i]
        speed_delta = abs(nxt["speed"] - prev["speed"])
        speed_changes.append(speed_delta)
        accelerations.append(speed_delta / max(nxt["dt"], 1))
        angle_delta = abs(nxt["angle"] - prev["angle"])
        direction_changes.append(min(angle_delta, 2 * math.pi - angle_delta))
        next_segments.append(nxt)

    if speed_changes:
        out["mouse_speed_change_mean"] = round(mean(speed_changes), 6)
    if accelerations:
        out["mouse_acceleration_mean"] = round(mean(accelerations), 6)
    if direction_changes:
        curvatures = [
            direction_changes[i] / max(next_segments[i]["dist"], 1)
            for i in range(len(direction_changes))
        ]
        out["mouse_path_curvature_mean"] = round(mean(curvatures), 6)

    return out


# === 상수 ===

BALABIT_DEFAULT_ROOT = Path(
    r"C:\Users\SSAFY\Desktop\external_datasets\Mouse-Dynamics-Challenge-master\training_files"
)
COLLECTION_PIPELINE = "external_balabit"
SOURCE = "balabit_dataset"
START_TRIAL_ID_DEFAULT = 910001
CHUNK_SIZE_DEFAULT = 300
MAX_CHUNKS_PER_USER_DEFAULT = 50
RANDOM_SEED_DEFAULT = 42

# === ADR-016 메타 backfill (Balabit 풀 일괄) ===
ALGORITHM_TYPE = "human_balabit"
COORD_DOMAIN = "os_screen"  # RDP 환경이지만 OS 좌표 수집이라는 점에서 os_screen 으로 분류 (ADR-016)

KNOWN_BUTTONS = {"Left": "left", "Right": "right", "Middle": "middle"}
DROP_STATES = {"Released", "Down", "Up"}
MOVE_STATES = {"Move", "Drag"}

# Balabit 측정 artifact: x 또는 y == 65535 (0xFFFF, 16-bit unsigned overflow/sentinel)
# 정상 모니터 좌표가 아니라 OS 가 마우스 화면 밖으로 나갔거나 이벤트 누락 시 박는 sentinel.
# 이 값을 그대로 두면 인접 segment 의 dx/dy 가 ~92,000 px 로 폭발해 max_speed outlier 유발
# (진단 결과: top3 max_speed > 5,700 이 모두 65535 sentinel 행 인접 segment 였음).
SENTINEL_COORD = 65535


# === 변환 로직 ===

def load_feature_names(yaml_path: Path) -> list[str]:
    """feature_config.yaml 의 모든 feature (44개) 이름 로드 (jsonl_to_trial 와 동일 패턴)."""
    with open(yaml_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    return [feature for group in cfg["groups"].values() for feature in group]


def map_state_event(state: str, button: str, unknown_counter: dict) -> tuple[str, str | None] | None:
    """Balabit (state, button) -> (event_type, button_str) or None (drop).

    unknown_counter: dict[(state, button)] = count. 호출측이 누적 카운트.
    """
    if state == "Pressed":
        btn = KNOWN_BUTTONS.get(button)
        if btn is None:
            unknown_counter[(state, button)] = unknown_counter.get((state, button), 0) + 1
            return None
        return ("mouse_click", btn)
    if state in MOVE_STATES:
        return ("mouse_move", None)
    if state in DROP_STATES:
        return None
    unknown_counter[(state, button)] = unknown_counter.get((state, button), 0) + 1
    return None


def csv_to_events(df: pd.DataFrame, unknown_counter: dict, sentinel_counter: dict) -> list[dict]:
    """CSV 한 세션 -> ts_ms/event/x/y/button 만 채워진 이벤트 dict 리스트 (시간순).

    sentinel_counter: dict[str, int]. "dropped" 키에 65535 좌표 drop 누적.
    """
    if df.empty:
        return []
    df = df.sort_values("client timestamp", kind="stable").reset_index(drop=True)

    ts_arr = df["client timestamp"].to_numpy()
    state_arr = df["state"].to_numpy()
    button_arr = df["button"].to_numpy()
    x_arr = df["x"].to_numpy()
    y_arr = df["y"].to_numpy()

    base_ts = float(ts_arr[0])
    events: list[dict] = []
    for ts, state, button, x, y in zip(ts_arr, state_arr, button_arr, x_arr, y_arr):
        if pd.isna(x) or pd.isna(y) or pd.isna(ts):
            continue
        ix, iy = int(x), int(y)
        if ix == SENTINEL_COORD or iy == SENTINEL_COORD:
            sentinel_counter["dropped"] = sentinel_counter.get("dropped", 0) + 1
            continue
        mapping = map_state_event(str(state), str(button), unknown_counter)
        if mapping is None:
            continue
        event_type, btn = mapping
        evt: dict = {
            "ts_ms": round((float(ts) - base_ts) * 1000.0, 3),
            "event": event_type,
            "x": ix,
            "y": iy,
        }
        if btn is not None:
            evt["button"] = btn
        events.append(evt)
    return events


def compute_deltas(events: list[dict]) -> None:
    """events 의 각 이벤트(첫 이벤트 제외)에 dx/dy/dt_ms/speed 추가 (in-place).

    EventLogger.log() (event_logger.py:73-122) 와 동일 공식:
    - prev = 직전 mouse 이벤트 (move/click 무관)
    - dx = round(x - prev.x, 2), dy = round(y - prev.y, 2)
    - dt_ms = round(ts_ms - prev.ts_ms, 3)
    - speed = round(sqrt(dx^2+dy^2)/dt_ms, 4) if dt_ms > 0
    - 첫 이벤트는 dx/dy/dt_ms/speed 키 자체 없음 (to_dict 패턴)
    """
    prev: dict | None = None
    for evt in events:
        if prev is not None:
            dx = round(float(evt["x"] - prev["x"]), 2)
            dy = round(float(evt["y"] - prev["y"]), 2)
            dt_ms = round(evt["ts_ms"] - prev["ts_ms"], 3)
            evt["dx"] = dx
            evt["dy"] = dy
            evt["dt_ms"] = dt_ms
            if dt_ms > 0:
                evt["speed"] = round(math.sqrt(dx * dx + dy * dy) / dt_ms, 4)
        prev = evt


def chunk_events(events: list[dict], chunk_size: int) -> list[list[dict]]:
    """events 를 chunk_size 단위로 분할. 마지막 chunk 가 chunk_size 미만이면 drop."""
    chunks: list[list[dict]] = []
    n = len(events)
    for start in range(0, n, chunk_size):
        chunk = events[start:start + chunk_size]
        if len(chunk) >= chunk_size:
            chunks.append(chunk)
    return chunks


def rebase_chunk(chunk: list[dict]) -> list[dict]:
    """chunk 의 ts_ms 를 0 기준 재기준 + 첫 이벤트의 dx/dy/dt_ms/speed 키 제거.

    chunk 경계를 넘어 prev 참조하면 안 되므로 첫 이벤트는 delta 정보 없어야 함
    (lv2 trial.json 의 첫 eventRow 도 동일 패턴).
    """
    if not chunk:
        return chunk
    base_ts = chunk[0]["ts_ms"]
    rebased: list[dict] = []
    for i, evt in enumerate(chunk):
        new_evt = dict(evt)
        new_evt["ts_ms"] = round(new_evt["ts_ms"] - base_ts, 3)
        if i == 0:
            for k in ("dx", "dy", "dt_ms", "speed"):
                new_evt.pop(k, None)
        rebased.append(new_evt)
    return rebased


def pick_chunks_session_balanced(
    chunk_counts: dict[str, int],
    target: int,
    rng: random.Random,
) -> dict[str, list[int]]:
    """session 별 균등 분배 + 무작위 샘플링.

    반환: session_label -> [선택된 chunk index 정렬됨].
    알고리즘:
      1. 각 session 에서 base = target // S 개 무작위 (chunk 부족하면 가능한 만큼)
      2. 부족분은 남은 풀에서 무작위 보충
    """
    sessions = sorted(chunk_counts.keys())
    if not sessions or target <= 0:
        return {s: [] for s in sessions}

    base = target // len(sessions)
    picked: dict[str, list[int]] = {s: [] for s in sessions}
    leftover: list[tuple[str, int]] = []

    for s in sessions:
        n = chunk_counts[s]
        all_idx = list(range(n))
        rng.shuffle(all_idx)
        take_now = min(base, n)
        picked[s] = all_idx[:take_now]
        leftover.extend((s, idx) for idx in all_idx[take_now:])

    chosen = sum(len(v) for v in picked.values())
    remainder = target - chosen
    if remainder > 0 and leftover:
        rng.shuffle(leftover)
        for s, idx in leftover[:remainder]:
            picked[s].append(idx)

    for s in picked:
        picked[s].sort()
    return picked


def build_trial(
    events: list[dict],
    trial_id: int,
    session_id: str,
    user_name: str,
    all_features: list[str],
) -> dict:
    """chunk events -> trial.json dict (lv2 스키마 호환, label='human').

    ADR-016 메타 backfill:
      - root: coord_domain, screen_width, screen_height, algorithm_type, user_id
      - eventRows[*]: nx, ny (mouse_* 이벤트만, screen_width null 이므로 모두 null)
    """
    metrics: dict = {f: None for f in all_features}
    metrics.update(extract_seven_features(events))

    duration_ms = (events[-1]["ts_ms"] - events[0]["ts_ms"]) if len(events) >= 2 else 0.0
    click_count = sum(1 for e in events if e.get("event") == "mouse_click")

    screen_width: int | None = None
    screen_height: int | None = None
    user_id = f"balabit_{user_name}"

    event_rows = [_add_nx_ny(dict(e), screen_width, screen_height) for e in events]

    trial = {
        "trialId": trial_id,
        "label": "human",
        "coord_domain": COORD_DOMAIN,
        "screen_width": screen_width,
        "screen_height": screen_height,
        "algorithm_type": ALGORITHM_TYPE,
        "user_id": user_id,
        "summary": {
            "collection_pipeline": COLLECTION_PIPELINE,
            "session_id": session_id,
            "source": SOURCE,
            "durationMs": round(float(duration_ms), 3),
            "clickCount": click_count,
            "eventCount": len(events),
            "metrics_compatibility": {},
        },
        "metrics": metrics,
        "eventRows": event_rows,
    }

    for w in validate_meta(trial):
        print(f"  [warn] trial_{trial_id}: {w}")

    return trial


def process_user(
    user_dir: Path,
    start_trial_id: int,
    all_features: list[str],
    output_dir: Path,
    chunk_size: int,
    max_chunks: int,
    seed: int,
    dry_run: bool,
    overwrite: bool,
) -> dict:
    """한 사용자 디렉토리 처리. 반환: 통계 dict."""
    user_name = user_dir.name
    rng = random.Random(seed)
    sessions = sorted(user_dir.glob("session_*"))
    unknown_counter: dict = {}
    sentinel_counter: dict = {}

    per_session_chunks: dict[str, list[list[dict]]] = {}
    for sess_path in sessions:
        try:
            df = pd.read_csv(sess_path)
        except Exception as e:
            print(f"  [warn] {user_name}/{sess_path.name} read failed: {e}")
            continue
        events = csv_to_events(df, unknown_counter, sentinel_counter)
        if not events:
            continue
        compute_deltas(events)
        chunks = chunk_events(events, chunk_size)
        if chunks:
            per_session_chunks[sess_path.stem] = chunks

    if unknown_counter:
        top = sorted(unknown_counter.items(), key=lambda kv: -kv[1])[:5]
        summary = ", ".join(f"{state}/{btn}={n}" for (state, btn), n in top)
        print(f"  [{user_name}] unknown/dropped state-button: {summary}")
    sentinel_dropped = sentinel_counter.get("dropped", 0)
    if sentinel_dropped:
        print(f"  [{user_name}] sentinel coord (65535) drop: {sentinel_dropped} rows")

    if not per_session_chunks:
        return {
            "user": user_name, "trials_written": 0, "skipped_exists": 0,
            "next_trial_id": start_trial_id, "first_trial_id": None, "last_trial_id": None,
            "available_chunks_total": 0, "available_sessions": 0, "target_chunks": 0,
            "avg_events": 0, "avg_clicks": 0, "sentinel_dropped": sentinel_dropped,
        }

    chunk_counts = {s: len(c) for s, c in per_session_chunks.items()}
    target = min(max_chunks, sum(chunk_counts.values()))
    picked = pick_chunks_session_balanced(chunk_counts, target, rng)

    trial_id = start_trial_id
    written = 0
    skipped_exists = 0
    first_id: int | None = None
    last_id: int | None = None
    event_counts: list[int] = []
    click_counts: list[int] = []

    for sess_label in sorted(picked.keys()):
        for ci in picked[sess_label]:
            chunk = rebase_chunk(per_session_chunks[sess_label][ci])
            session_id = f"balabit_{user_name}_{sess_label}_chunk_{ci:03d}"
            trial = build_trial(chunk, trial_id, session_id, user_name, all_features)

            out_path = output_dir / f"trial_{trial_id}.json"
            if out_path.exists() and not overwrite:
                skipped_exists += 1
                trial_id += 1
                continue

            if not dry_run:
                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump(trial, f, ensure_ascii=False, indent=2)

            event_counts.append(trial["summary"]["eventCount"])
            click_counts.append(trial["summary"]["clickCount"])
            if first_id is None:
                first_id = trial_id
            last_id = trial_id
            trial_id += 1
            written += 1

    return {
        "user": user_name,
        "available_chunks_total": sum(chunk_counts.values()),
        "available_sessions": len(chunk_counts),
        "target_chunks": target,
        "trials_written": written,
        "skipped_exists": skipped_exists,
        "next_trial_id": trial_id,
        "first_trial_id": first_id,
        "last_trial_id": last_id,
        "avg_events": round(mean(event_counts), 1) if event_counts else 0,
        "avg_clicks": round(mean(click_counts), 2) if click_counts else 0,
        "sentinel_dropped": sentinel_dropped,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Balabit CSV -> trial.json 변환 (mouse_automation 호환, label=human)"
    )
    parser.add_argument("--balabit-root", type=Path, default=BALABIT_DEFAULT_ROOT,
                        help=f"기본 {BALABIT_DEFAULT_ROOT}")
    parser.add_argument("--output-dir", type=Path, default=None,
                        help="기본 services/ai/data/behavior")
    parser.add_argument("--start-trial-id", type=int, default=START_TRIAL_ID_DEFAULT,
                        help=f"trial_id 시작값 (기본 {START_TRIAL_ID_DEFAULT}, lv2=900001+ 와 격리)")
    parser.add_argument("--chunk-size", type=int, default=CHUNK_SIZE_DEFAULT,
                        help=f"chunk 당 이벤트 수 (기본 {CHUNK_SIZE_DEFAULT})")
    parser.add_argument("--max-chunks-per-user", type=int, default=MAX_CHUNKS_PER_USER_DEFAULT,
                        help=f"사용자당 최대 chunk 수 (기본 {MAX_CHUNKS_PER_USER_DEFAULT})")
    parser.add_argument("--seed", type=int, default=RANDOM_SEED_DEFAULT,
                        help=f"무작위 샘플링 seed (기본 {RANDOM_SEED_DEFAULT}, 결정성)")
    parser.add_argument("--config", type=Path, default=None,
                        help="기본 services/ai/configs/feature_config.yaml")
    parser.add_argument("--dry-run", action="store_true", help="파일 안 쓰고 카운트만")
    parser.add_argument("--overwrite", action="store_true", help="기존 trial 덮어쓰기 허용")
    parser.add_argument("--user-filter", type=str, default=None,
                        help="특정 user{N} 만 변환 (예: user7)")
    args = parser.parse_args()

    ai_root = Path(__file__).resolve().parents[3]
    output_dir = args.output_dir or (ai_root / "data" / "behavior")
    config_path = args.config or (ai_root / "configs" / "feature_config.yaml")

    if not args.balabit_root.exists():
        print(f"[error] Balabit root 없음: {args.balabit_root}")
        return 1
    if not config_path.exists():
        print(f"[error] feature_config.yaml 없음: {config_path}")
        return 1

    all_features = load_feature_names(config_path)
    if len(all_features) != 44:
        print(f"[warn] feature_config feature 수 {len(all_features)} (예상 44)")

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
    print(f"chunk_size={args.chunk_size}, max_chunks_per_user={args.max_chunks_per_user}, seed={args.seed}")
    print(f"dry_run={args.dry_run}, overwrite={args.overwrite}")
    print()

    if not args.dry_run:
        output_dir.mkdir(parents=True, exist_ok=True)

    next_trial_id = args.start_trial_id
    user_results: list[dict] = []

    for udir in user_dirs:
        print(f"[{udir.name}] processing...")
        result = process_user(
            udir, next_trial_id, all_features, output_dir,
            args.chunk_size, args.max_chunks_per_user, args.seed,
            args.dry_run, args.overwrite,
        )
        user_results.append(result)
        next_trial_id = result["next_trial_id"]

    print()
    print("=== Balabit 변환 결과 ===")
    total_written = 0
    total_skip = 0
    total_sentinel = 0
    for r in user_results:
        if r["trials_written"] == 0 and r["skipped_exists"] == 0:
            print(f"  {r['user']:8s}: 변환 0  (사용 가능 chunk={r['available_chunks_total']}, "
                  f"sessions={r['available_sessions']}, sentinel={r.get('sentinel_dropped', 0)})")
        else:
            range_str = (
                f"trial_{r['first_trial_id']}..{r['last_trial_id']}"
                if r["first_trial_id"] is not None else "(skip-only)"
            )
            print(
                f"  {r['user']:8s}: 변환 {r['trials_written']:3d} chunks -> {range_str}  "
                f"(avg_events={r['avg_events']}, avg_clicks={r['avg_clicks']}, "
                f"available={r['available_chunks_total']} from {r['available_sessions']} sessions, "
                f"target={r['target_chunks']}, skip_exists={r['skipped_exists']}, "
                f"sentinel_drop={r.get('sentinel_dropped', 0)})"
            )
        total_written += r["trials_written"]
        total_skip += r["skipped_exists"]
        total_sentinel += r.get("sentinel_dropped", 0)

    print("---")
    print(f"  총 변환: {total_written}")
    print(f"  총 skip-exists: {total_skip}")
    print(f"  총 sentinel (65535) drop: {total_sentinel} rows")
    if total_written > 0 or total_skip > 0:
        print(f"  trial_id 범위: {args.start_trial_id} ~ {next_trial_id - 1}")
    print(f"  출력 폴더: {output_dir}")

    if total_written > 0:
        # lv2 누적: human 51, macro 101 가정. balabit human 추가 후 train(80%) 기준 예측.
        est_human_train = int(round((51 + total_written) * 0.8))
        est_macro_train = int(round(101 * 0.8))
        est_spw = est_human_train / max(est_macro_train, 1)
        print(
            f"  scale_pos_weight 예상 (combined train, lv2 51 human / 101 macro 가정): "
            f"n_neg ~{est_human_train}, n_pos ~{est_macro_train} -> SCALE_POS_WEIGHT ~{est_spw:.2f} "
            f"(xgboost_gyeom.ipynb 자동 갱신)"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
