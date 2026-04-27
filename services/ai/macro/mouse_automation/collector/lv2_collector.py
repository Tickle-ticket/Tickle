"""Lv2 매크로 데이터 수집기 — yaml 없이 코드 내부 액션으로 풍부한 mouse_move 생성.

용도: ML 분류 모델 학습용 매크로 라벨 데이터 수집. 기존 click-only 매크로 출력은
mouse_move 가 0개라 분류기 신호가 부족하다. lv2 의 베지어 + Fitts 시퀀스를 그대로
재사용하되, 무거운 yaml + BaseMacro 결합을 제거하고 액션을 코드 내부에서 랜덤 생성.

산출물: data/raw/macro/{session_id}.jsonl  (EventLogger 가 자동 생성)
source 라벨: "pyautogui_lv2_collector" (기존 pyautogui_lv2 와 구분 가능)

실행: cwd = services/ai/
    python -m macro.mouse_automation.collector.lv2_collector --sessions 1
    python -m macro.mouse_automation.collector.lv2_collector --sessions 30 --seed 42
"""
# isort: skip_file  # ensure_dpi_aware()는 pyautogui import 전에 실행되어야 함
import argparse
import random
import time

from macro.mouse_automation.core._dpi import ensure_dpi_aware

ensure_dpi_aware()
import pyautogui

from macro.mouse_automation.core.event_logger import EventLogger
from macro.mouse_automation.core.mouse_utils import (
    add_noise,
    bezier_curve,
    human_like_duration,
    random_delay,
)
from macro.mouse_automation.core.session import Session


# 안전 영역 — 화면 가운데 직사각형. pyautogui FAILSAFE(0,0)와 충분히 이격.
SAFE_X_MIN, SAFE_X_MAX = 800, 1200
SAFE_Y_MIN, SAFE_Y_MAX = 400, 800

# lv2 기본값과 동일하게 맞춤 (pyautogui_lv2.py 참조)
COORD_NOISE_SIGMA = 4
BEZIER_POINTS = 20
BEZIER_SPREAD = 80
DELAY_MIN = 0.1
DELAY_MAX = 0.8
MIN_CLICK_DIST = 50  # 인접 클릭 간 최소 거리 — 너무 짧은 이동 방지


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


def run_session(clicks_min: int, clicks_max: int) -> tuple[str, int, int]:
    """한 세션 실행. (session_id, mouse_move 카운트, mouse_click 카운트) 반환."""
    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.01

    session = Session(source="pyautogui_lv2_collector", label="macro")
    logger = EventLogger(session)

    num_clicks = random.randint(clicks_min, clicks_max)
    start_pos = pyautogui.position()
    targets = _gen_targets(num_clicks, (start_pos[0], start_pos[1]))

    move_count = 0
    click_count = 0

    session.start()
    try:
        current = (start_pos[0], start_pos[1])
        for raw_x, raw_y in targets:
            target_x, target_y = add_noise(raw_x, raw_y, sigma=COORD_NOISE_SIGMA)

            path = bezier_curve(
                current, (target_x, target_y),
                num_points=BEZIER_POINTS,
                spread=BEZIER_SPREAD,
            )
            dist = ((target_x - current[0]) ** 2 + (target_y - current[1]) ** 2) ** 0.5
            total_duration = human_like_duration(dist)
            step_time = total_duration / max(len(path), 1)

            for px, py in path:
                pyautogui.moveTo(px, py, duration=0)
                logger.log("mouse_move", x=px, y=py)
                move_count += 1
                time.sleep(step_time)

            pyautogui.click(target_x, target_y)
            logger.log("mouse_click", x=target_x, y=target_y, button="left")
            click_count += 1
            current = (target_x, target_y)

            random_delay(DELAY_MIN, DELAY_MAX)
    finally:
        session.end()
        logger.flush()

    return session.session_id, move_count, click_count


def main():
    parser = argparse.ArgumentParser(description="Lv2 매크로 데이터 수집기 (yaml-free)")
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
