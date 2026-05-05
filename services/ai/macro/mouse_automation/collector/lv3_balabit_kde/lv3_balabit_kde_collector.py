"""Lv3 Balabit KDE 휴먼라이크 매크로 데이터 수집기 (티켓 315 Sub-step D).

다중 사용자 KDE 휴먼라이크 매크로. trial 시작 시 균등 random user pick → 그 user 의
sampler/pool 로 trial 끝까지 일관 sampling. v2 (보겸 1인 데이터) outlier 한계 극복.

산출물: data/raw/macro/{session_id}.jsonl  (EventLogger 자동, lv2/lv3_linear 와 동일 정책)
source 라벨: "pyautogui_lv3_balabit_kde_collector"

명명 (분석 chat 결정):
  algorithm_type        = lv3_balabit_kde         (trial.json 메타, jsonl_to_trial 변환 후 박힘)
  user_id               = balabit_kde_{user}      (어느 user 분포로 생성했는지 추적)
  collection_pipeline   = mouse_automation_lv3_balabit_kde

실행 (cwd = services/ai/):
    python -m macro.mouse_automation.collector.lv3_balabit_kde.lv3_balabit_kde_collector --dry-run
    python -m macro.mouse_automation.collector.lv3_balabit_kde.lv3_balabit_kde_collector --sessions 1 --seed 315
    python -m macro.mouse_automation.collector.lv3_balabit_kde.lv3_balabit_kde_collector --sessions 100 --seed 315

dry-run: pyautogui 호출 X. sampler/pool 로드 + trajectory 생성만 검증 (jsonl 저장 X, 실제 마우스 X).
"""
# isort: skip_file  # ensure_dpi_aware()는 pyautogui import 전에 실행되어야 함
from __future__ import annotations

import argparse
import random
import time
from pathlib import Path

from macro.mouse_automation.collector.lv3_balabit_kde.kde_sampler import KDESampler
from macro.mouse_automation.collector.lv3_balabit_kde.trace_pool import TracePool
from macro.mouse_automation.collector.lv3_balabit_kde.trajectory import generate_trajectory


# 안전 영역 — lv2/lv3_linear 와 동일 (의문 4 결정: SAFE random)
SAFE_X_MIN, SAFE_X_MAX = 800, 1200
SAFE_Y_MIN, SAFE_Y_MAX = 400, 800
SAFE_CENTER = ((SAFE_X_MIN + SAFE_X_MAX) // 2, (SAFE_Y_MIN + SAFE_Y_MAX) // 2)
MIN_CLICK_DIST = 50

# 산출물 디렉토리
PARAMS_DIR_DEFAULT = Path("data/processed/balabit_kde_params")
POOL_DIR_DEFAULT = Path("data/processed/balabit_trace_pool")

SOURCE = "pyautogui_lv3_balabit_kde_collector"


def _list_users(params_dir: Path) -> list[str]:
    """params_dir 의 *.json glob → user 이름 리스트 (확장자 stem).
    hardcoded list 회피 — Sub-step B 산출물 따라 자동 변경.
    """
    return sorted(p.stem for p in params_dir.glob("*.json"))


def _pick_user(rng: random.Random, users: list[str]) -> str:
    """균등 random — params_dir 에서 발견된 user 중 1명."""
    if not users:
        raise ValueError("params_dir 에 user 없음. Sub-step B 먼저 실행.")
    return rng.choice(users)


def _load_user_artifacts(
    user_id: str,
    params_dir: Path,
    pool_dir: Path,
) -> tuple[KDESampler, TracePool]:
    """trial 시작 시 1회 로드."""
    sampler = KDESampler.from_user(user_id, params_dir)
    pool = TracePool.from_user(user_id, pool_dir)
    return sampler, pool


def _gen_targets(num: int, prev: tuple[int, int], rng: random.Random) -> list[tuple[int, int]]:
    """안전 영역 안에서 랜덤 클릭 좌표 num 개 생성 (lv3_linear 와 동일 패턴, rng 인자 추가)."""
    targets: list[tuple[int, int]] = []
    last = prev
    for _ in range(num):
        for _attempt in range(20):
            x = rng.randint(SAFE_X_MIN, SAFE_X_MAX)
            y = rng.randint(SAFE_Y_MIN, SAFE_Y_MAX)
            dist = ((x - last[0]) ** 2 + (y - last[1]) ** 2) ** 0.5
            if dist >= MIN_CLICK_DIST:
                break
        targets.append((x, y))
        last = (x, y)
    return targets


def run_session(
    clicks_min: int,
    clicks_max: int,
    rng: random.Random,
    params_dir: Path,
    pool_dir: Path,
    dry_run: bool,
) -> dict:
    """한 session 실행.

    1. _list_users(params_dir) → 균등 random user pick
    2. sampler/pool 로드
    3. clicks_min~max 클릭 수 random
    4. 각 click 좌표 SAFE 영역 random
    5. 좌표 간 generate_trajectory()
    6. 각 step pyautogui.moveTo + EventLogger.log("mouse_move", ...)
    7. pyautogui.click + EventLogger.log("mouse_click", ...)
    8. inter_click_interval = sampler.sample("inter_click_interval_ms") → time.sleep
       (lv2/lv3_linear 의 random_delay 대체)

    반환: 통계 dict (session_id, user_id, move_count, click_count, fallback_count, trajectory_count)
    """
    users = _list_users(params_dir)
    user_id = _pick_user(rng, users)
    sampler, pool = _load_user_artifacts(user_id, params_dir, pool_dir)

    num_clicks = rng.randint(clicks_min, clicks_max)
    move_count = 0
    click_count = 0
    fallback_count = 0
    trajectory_count = 0

    if dry_run:
        # pyautogui 호출 X. sampler/pool 로드 + trajectory 생성만 검증.
        # session_id 는 가짜로 부여 (jsonl 저장 X)
        session_id = f"dryrun_{user_id}_{rng.randrange(0xFFFFFF):06x}"
        # SAFE 영역 임의 시작 좌표 (pyautogui.position() 안 부름)
        start_pos = (rng.randint(SAFE_X_MIN, SAFE_X_MAX), rng.randint(SAFE_Y_MIN, SAFE_Y_MAX))
        targets = _gen_targets(num_clicks, start_pos, rng)
        current = start_pos
        for tx, ty in targets:
            traj, was_fb = generate_trajectory(current, (tx, ty), sampler, pool, rng)
            if was_fb:
                fallback_count += 1
            trajectory_count += 1
            move_count += len(traj)
            click_count += 1
            current = (tx, ty)
        return {
            "session_id": session_id, "user_id": user_id,
            "move_count": move_count, "click_count": click_count,
            "fallback_count": fallback_count, "trajectory_count": trajectory_count,
            "dry_run": True,
        }

    # 실 실행 — pyautogui + EventLogger
    from macro.mouse_automation.core._dpi import ensure_dpi_aware
    ensure_dpi_aware()
    import pyautogui
    from macro.mouse_automation.core.event_logger import EventLogger
    from macro.mouse_automation.core.session import Session

    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.01

    # 옵션 A: 시작 위치 SAFE 중앙 강제 워프 (session.start() 전이라 jsonl 미로그).
    # pyautogui.position() 그대로 쓰면 듀얼 모니터 등 SAFE 밖 시작 시 첫 trajectory
    # distance 가 커져서 사람 trace 의 ny 곡률(±0.6) × distance 로 화면 모서리 진입 →
    # FAILSAFE 트리거. SAFE 안 시작이면 max distance 566px 로 곡률 영향 제한.
    pyautogui.moveTo(SAFE_CENTER[0], SAFE_CENTER[1], duration=0)
    start_pos = SAFE_CENTER

    session = Session(source=SOURCE, label="macro")
    logger = EventLogger(session)
    targets = _gen_targets(num_clicks, start_pos, rng)

    session.start()
    try:
        current = (start_pos[0], start_pos[1])
        for tx, ty in targets:
            traj, was_fb = generate_trajectory(current, (tx, ty), sampler, pool, rng)
            if was_fb:
                fallback_count += 1
            trajectory_count += 1

            for px, py, sleep_ms in traj:
                pyautogui.moveTo(px, py, duration=0)
                logger.log("mouse_move", x=px, y=py)
                move_count += 1
                if sleep_ms > 0:
                    time.sleep(sleep_ms / 1000.0)

            pyautogui.click(tx, ty)
            logger.log("mouse_click", x=tx, y=ty, button="left")
            click_count += 1
            current = (tx, ty)

            # inter_click 대기 — KDE 분포 (random_delay 대체)
            inter_ms = max(0.0, sampler.sample("inter_click_interval_ms", rng=rng))
            time.sleep(inter_ms / 1000.0)
    finally:
        session.end()
        logger.flush()

    return {
        "session_id": session.session_id, "user_id": user_id,
        "move_count": move_count, "click_count": click_count,
        "fallback_count": fallback_count, "trajectory_count": trajectory_count,
        "dry_run": False,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Lv3 Balabit KDE 휴먼라이크 매크로 수집기 (티켓 315)"
    )
    parser.add_argument("--sessions", type=int, default=1, help="수집할 세션 수")
    parser.add_argument("--clicks-min", type=int, default=5, help="세션당 최소 클릭 수")
    parser.add_argument("--clicks-max", type=int, default=15, help="세션당 최대 클릭 수")
    parser.add_argument("--seed", type=int, default=None, help="재현용 시드 (옵션)")
    parser.add_argument("--params-dir", type=Path, default=None,
                        help="기본 services/ai/data/processed/balabit_kde_params")
    parser.add_argument("--pool-dir", type=Path, default=None,
                        help="기본 services/ai/data/processed/balabit_trace_pool")
    parser.add_argument("--dry-run", action="store_true",
                        help="pyautogui 호출 X. sampler/pool/trajectory 생성만 검증.")
    args = parser.parse_args()

    if args.clicks_min > args.clicks_max:
        parser.error("--clicks-min 은 --clicks-max 이하여야 합니다")

    ai_root = Path(__file__).resolve().parents[4]
    params_dir = args.params_dir or (ai_root / PARAMS_DIR_DEFAULT)
    pool_dir = args.pool_dir or (ai_root / POOL_DIR_DEFAULT)

    if not params_dir.exists():
        print(f"[error] params dir 없음: {params_dir}. Sub-step B 먼저 실행.")
        return 1
    if not pool_dir.exists():
        print(f"[error] pool dir 없음: {pool_dir}. Sub-step C 먼저 실행.")
        return 1

    users = _list_users(params_dir)
    print(f"[lv3_balabit_kde_collector] sessions={args.sessions} "
          f"clicks={args.clicks_min}-{args.clicks_max} dry_run={args.dry_run}")
    print(f"  params_dir: {params_dir}")
    print(f"  pool_dir:   {pool_dir}")
    print(f"  user pool:  {len(users)} ({users})")

    rng = random.Random(args.seed) if args.seed is not None else random.Random()

    total_fallback = 0
    total_trajectory = 0
    for i in range(1, args.sessions + 1):
        result = run_session(
            args.clicks_min, args.clicks_max, rng,
            params_dir, pool_dir, args.dry_run,
        )
        print(
            f"[{i}/{args.sessions}] session_id={result['session_id']} "
            f"user_id={result['user_id']} "
            f"mouse_move={result['move_count']} mouse_click={result['click_count']} "
            f"trajectory={result['trajectory_count']} fallback={result['fallback_count']}"
        )
        total_fallback += result["fallback_count"]
        total_trajectory += result["trajectory_count"]

    if total_trajectory > 0:
        pct = 100.0 * total_fallback / total_trajectory
        print(f"\n  fallback 빈도: {total_fallback} / {total_trajectory} trajectories ({pct:.2f}%)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
