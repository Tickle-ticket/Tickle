from __future__ import annotations

import argparse
import random
import sys
from dataclasses import dataclass

from playwright.sync_api import Locator
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import Page, sync_playwright


DEFAULT_URL = "http://localhost:5173"
DEFAULT_SEATS = ("B3", "B4")


@dataclass
class MacroConfig:
    url: str
    seats: tuple[str, ...]
    headless: bool
    skip_queue: bool
    confirm_booking: bool
    repeat: int
    timeout_ms: int
    slow_mo_ms: int
    action_delay_ms: int
    hover_ms: int
    typing_delay_ms: int
    mouse_steps: int


def parse_args() -> MacroConfig:
    parser = argparse.ArgumentParser(description="Automate the browser automation simulator with Playwright.")
    parser.add_argument("--url", default=DEFAULT_URL, help="Simulator URL.")
    parser.add_argument("--seats", nargs="+", default=list(DEFAULT_SEATS), help="Seat ids to click, e.g. B3 B4.")
    parser.add_argument("--headless", action="store_true", help="Run Chromium in headless mode.")
    parser.add_argument("--skip-queue", action="store_true", help="Click 'Skip to captcha' instead of waiting for queue countdown.")
    parser.add_argument("--confirm-booking", action="store_true", help="Click 'Proceed Booking' after selecting seats.")
    parser.add_argument("--repeat", type=int, default=1, help="Number of times to repeat the flow.")
    parser.add_argument("--timeout-ms", type=int, default=15000, help="Default Playwright timeout in milliseconds.")
    parser.add_argument("--slow-mo-ms", type=int, default=10, help="Delay between Playwright actions in milliseconds.")
    parser.add_argument("--action-delay-ms", type=int, default=10, help="Extra wait between major actions.")
    parser.add_argument("--hover-ms", type=int, default=10, help="Hover dwell before click in milliseconds.")
    parser.add_argument("--typing-delay-ms", type=int, default=10, help="Typing delay per character in milliseconds.")
    parser.add_argument("--mouse-steps", type=int, default=6, help="Mouse move interpolation steps.")

    args = parser.parse_args()
    
    return MacroConfig(
        url=args.url,
        seats=tuple(args.seats),
        headless=args.headless,
        skip_queue=args.skip_queue,
        confirm_booking=args.confirm_booking,
        repeat=max(1, args.repeat),
        timeout_ms=args.timeout_ms,
        slow_mo_ms=args.slow_mo_ms,
        action_delay_ms=max(0, args.action_delay_ms),
        hover_ms=max(0, args.hover_ms),
        typing_delay_ms=max(0, args.typing_delay_ms),
        mouse_steps=max(1, args.mouse_steps),
    )


def wait_ms(page: Page, ms: int) -> None:
    if ms > 0:
        page.wait_for_timeout(ms)


def move_and_click(page: Page, locator: Locator, config: MacroConfig) -> None:
    # 사람처럼 보이도록 목표 좌표까지 마우스를 움직인 뒤 클릭한다.
    locator.wait_for(state="visible", timeout=config.timeout_ms)
    box = locator.bounding_box()
    if box:
        target_x = box["x"] + box["width"] / 2
        target_y = box["y"] + box["height"] / 2
        page.mouse.move(target_x, target_y, steps=config.mouse_steps)
        wait_ms(page, config.hover_ms)
        page.mouse.click(target_x, target_y)
    else:
        locator.click()
    wait_ms(page, config.action_delay_ms)


def wait_for_captcha(page: Page, config: MacroConfig) -> None:
    # 설정에 따라 대기열을 건너뛰고 captcha 화면이 뜰 때까지 기다린다.
    if config.skip_queue:
        move_and_click(page, page.locator('[data-track-id="queue-skip"]'), config)
    page.locator('[data-track-id="captcha-input"]').wait_for(state="visible", timeout=config.timeout_ms)


def select_seats(page: Page, seat_ids: tuple[str, ...], config: MacroConfig) -> None:
    page.get_by_role("heading", name="Seat Selection").wait_for(state="visible", timeout=config.timeout_ms)
    for seat_id in seat_ids:
        locator = page.locator(f'[data-track-id="seat-{seat_id}"]')
        move_and_click(page, locator, config)


def fill_captcha(page: Page, config: MacroConfig) -> None:
    input_locator = page.locator('[data-track-id="captcha-input"]')
    input_locator.wait_for(state="visible", timeout=config.timeout_ms)
    move_and_click(page, input_locator, config)
    input_locator.fill("")
    input_locator.type("capcha", delay=config.typing_delay_ms)
    wait_ms(page, config.action_delay_ms)
    move_and_click(page, page.locator('[data-track-id="captcha-confirm"]'), config)


def jitter_seats(seats: tuple[str, ...]) -> tuple[str, ...]:
    values = list(seats)
    random.shuffle(values)
    return tuple(values)


def run_single(page: Page, config: MacroConfig, attempt: int) -> None:
    # 예매 시작 -> captcha -> 좌석 선택 -> 선택적으로 확정까지 한 번 수행한다.
    print(f"[1/5] Opening {config.url}")
    page.goto(config.url, wait_until="domcontentloaded")
    wait_ms(page, config.action_delay_ms)

    print("[2/5] Starting booking flow")
    move_and_click(page, page.get_by_role("button", name="Start Booking"), config)

    print("[3/5] Waiting for captcha")
    wait_for_captcha(page, config)

    print("[4/5] Filling captcha")
    fill_captcha(page, config)

    seats = jitter_seats(config.seats) if len(config.seats) > 1 else config.seats
    print(f"[5/5] Selecting seats: {', '.join(seats)}")
    select_seats(page, seats, config)

    if config.confirm_booking:
        print("[extra] Confirming booking")
        move_and_click(page, page.locator('[data-track-id="proceed-booking"]'), config)
        page.get_by_role("heading", name="Booking Confirmed").wait_for(state="visible", timeout=config.timeout_ms)
    else:
        page.locator('[data-track-id="proceed-booking"]').wait_for(state="visible", timeout=config.timeout_ms)

    print(f"Run {attempt} completed successfully.")


def run_macro(config: MacroConfig) -> int:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=config.headless, slow_mo=config.slow_mo_ms)

        try:
            for attempt in range(1, config.repeat + 1):
                print(f"=== Run {attempt}/{config.repeat} ===")
                context = browser.new_context(viewport={"width": 1440, "height": 1400})
                page = context.new_page()
                page.set_default_timeout(config.timeout_ms)
                run_single(page, config, attempt)
                context.close()

            browser.close()
            return 0
        except PlaywrightTimeoutError as error:
            print(f"Timeout while running macro: {error}", file=sys.stderr)
            browser.close()
            return 1
        except Exception as error:  # noqa: BLE001
            print(f"Macro failed: {error}", file=sys.stderr)
            browser.close()
            return 1


if __name__ == "__main__":
    raise SystemExit(run_macro(parse_args()))
