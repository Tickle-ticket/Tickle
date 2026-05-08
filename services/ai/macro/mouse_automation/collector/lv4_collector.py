"""Lv4 압도적 매크로 데이터 수집기 — 직선 + fixed timing + 노이즈 0 + fixed delay.

용도: macro spectrum 한쪽 끝 (압도적 매크로) 부재 해소. ticket 319 phase 3.
lv2_bezier (약간 매크로) / lv3_kde (사람 유사) 와 함께 학습 풀에 통합 후
chan 같은 압도적 매크로 OOD 분리 향상 측정.

산출물: data/raw/macro/{session_id}.jsonl  (EventLogger 자동 생성)
source 라벨: 'pyautogui_lv4_collector'
algorithm_type: 변환 시점에 jsonl_to_trial.py --algorithm-type=lv4_aggressive 로 명시.

실행: cwd = services/ai/
    python -m macro.mouse_automation.collector.lv4_collector --sessions 1
    python -m macro.mouse_automation.collector.lv4_collector --sessions 100 --seed 42
"""
# isort: skip_file  # ensure_dpi_aware()는 pyautogui import 전에 실행되어야 함
import argparse
import random
import time

from macro.mouse_automation.core._dpi import ensure_dpi_aware

ensure_dpi_aware()
import pyautogui

from macro.mouse_automation.core.event_logger import EventLogger
from macro.mouse_automation.core.session import Session


# 안전 영역 — 화면 자동 감지 후 가장자리 50px margin (FAILSAFE 코너와 이격)
SCREEN_WIDTH, SCREEN_HEIGHT = pyautogui.size()
SAFE_X_MIN, SAFE_X_MAX = 50, SCREEN_WIDTH - 50
SAFE_Y_MIN, SAFE_Y_MAX = 50, SCREEN_HEIGHT - 50
MIN_CLICK_DIST = 50

# lv4 압도적 매크로 파라미터 (lv2 와 차이점)
PATH_POINTS = 10        # 직선 위 10 등분 (lv2: bezier_curve 20점)
STEP_TIME = 0.005       # 5ms fixed (lv2: human_like_duration 동적)
DELAY = 0               # no delay (lv2: random_delay 0.1~0.8)
# COORD_NOISE_SIGMA = 0 → add_noise 호출 안 함 (lv2: sigma=4)


def _gen_targets(num: int, prev: tuple[int, int]) -> list[tuple[int, int]]:
    """안전 영역 안에서 랜덤 클릭 좌표 num 개 생성. 직전 좌표와 너무 가까우면 재추첨."""
    targets: list[tuple[int, int]] = []
    last = prev
    for _ in range(num):
        for _attempt in range(20):
            x = random.randint(SAFE_X_MIN, SAFE_X_MAX)
            y = random.randint(SAFE_Y_MIN, SAFE_Y_MAX)
            dist = ((x - last[0]) ** 2 + (y - last[1]) ** 2) ** 0.5
            if dist >= MIN_CLICK_DIST:
                break
        targets.append((x, y))
        last = (x, y)
    return targets


def _straight_path(
    start: tuple[int, int],
    end: tuple[int, int],
    num_points: int,
) -> list[tuple[int, int]]:
    """직선 path. num_points 등분 (start 포함, end 포함). int round 로 lv2 출력 형식 일관성."""
    if num_points <= 1:
        return [end]
    sx, sy = start
    ex, ey = end
    return [
        (
            round(sx + (ex - sx) * i / (num_points - 1)),
            round(sy + (ey - sy) * i / (num_points - 1)),
        )
        for i in range(num_points)
    ]


def run_session(clicks_min: int, clicks_max: int) -> tuple[str, int, int]:
    """한 세션 실행. (session_id, mouse_move 카운트, mouse_click 카운트) 반환."""
    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.01

    session = Session(source="pyautogui_lv4_collector", label="macro")
    logger = EventLogger(session)

    num_clicks = random.randint(clicks_min, clicks_max)
    start_pos = pyautogui.position()
    targets = _gen_targets(num_clicks, (start_pos[0], start_pos[1]))

    move_count = 0
    click_count = 0

    session.start()
    try:
        current = (start_pos[0], start_pos[1])
        for target_x, target_y in targets:
            path = _straight_path(current, (target_x, target_y), num_points=PATH_POINTS)

            for px, py in path:
                pyautogui.moveTo(px, py, duration=0)
                logger.log("mouse_move", x=px, y=py)
                move_count += 1
                time.sleep(STEP_TIME)

            pyautogui.click(target_x, target_y)
            logger.log("mouse_click", x=target_x, y=target_y, button="left")
            click_count += 1
            current = (target_x, target_y)

            time.sleep(DELAY)
    finally:
        session.end()
        logger.flush()

    return session.session_id, move_count, click_count


def main():
    parser = argparse.ArgumentParser(description="Lv4 압도적 매크로 데이터 수집기 (직선 + fixed timing)")
    parser.add_argument("--sessions", type=int, default=1, help="수집할 세션 수")
    parser.add_argument("--clicks-min", type=int, default=5, help="세션당 최소 클릭 수")
    parser.add_argument("--clicks-max", type=int, default=15, help="세션당 최대 클릭 수")
    parser.add_argument("--seed", type=int, default=None, help="재현용 시드 (옵션)")
    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)

    if args.clicks_min > args.clicks_max:
        parser.error("--clicks-min 은 --clicks-max 이하여야 합니다")

    print(f"[collector] sessions={args.sessions} clicks={args.clicks_min}-{args.clicks_max}")
    for i in range(1, args.sessions + 1):
        sid, moves, clicks = run_session(args.clicks_min, args.clicks_max)
        print(f"[{i}/{args.sessions}] session_id={sid} mouse_move={moves} mouse_click={clicks}")


if __name__ == "__main__":
    main()
