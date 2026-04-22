from __future__ import annotations

import argparse
import random
import sys
from dataclasses import dataclass, replace
from typing import Callable, Iterable

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


ProgressCallback = Callable[[str], None]


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
        timeout_ms=max(1000, args.timeout_ms),
        slow_mo_ms=max(0, args.slow_mo_ms),
        action_delay_ms=max(0, args.action_delay_ms),
        hover_ms=max(0, args.hover_ms),
        typing_delay_ms=max(0, args.typing_delay_ms),
        mouse_steps=max(1, args.mouse_steps),
    )


def config_for_single_run(config: MacroConfig) -> MacroConfig:
    """GUI에서 여러 config를 따로 실행할 수 있게 1회 실행용 config를 만든다."""
    return replace(config, repeat=1)


def wait_ms(page: Page, ms: int) -> None:
    if ms > 0:
        page.wait_for_timeout(ms)


def wait_for_collector_ready(page: Page, timeout_ms: int) -> None:
    """Wait until the simulator has loaded existing trials from collector API.

    If we click 'Start Booking' too fast (especially in headless/macro mode),
    the simulator may not have finished fetching /api/trials yet, so it will
    start from trialId=1 and overwrite trial_00001.json repeatedly.
    """

    connected = page.locator("text=collector API connected")
    unavailable = page.locator("text=collector API unavailable")

    # Wait for either "connected" or "unavailable".
    try:
        connected.or_(unavailable).first.wait_for(state="visible", timeout=timeout_ms)
    except PlaywrightTimeoutError as error:
        raise PlaywrightTimeoutError(
            f"Timed out waiting for collector API status message within {timeout_ms}ms"
        ) from error

    if unavailable.count() > 0:
        # Give caller a clear error so we don't silently write trialId=1 forever.
        raise RuntimeError("collector API unavailable: simulator could not load existing trials")


def move_and_click(page: Page, locator: Locator, config: MacroConfig) -> None:
    # 사람처럼 요소 중앙으로 마우스를 이동한 뒤 클릭한다.
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
    # 큐를 기다리거나 스킵해서 captcha 단계로 이동한다.
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


def run_single(page: Page, config: MacroConfig, attempt: int, progress: ProgressCallback | None = None) -> None:
    def emit(message: str) -> None:
        print(message)
        if progress:
            progress(message)

    emit(f"[1/5] Opening {config.url}")
    page.goto(config.url, wait_until="domcontentloaded")
    wait_ms(page, config.action_delay_ms)

    emit("[pre] Waiting for collector API connection")
    wait_for_collector_ready(page, timeout_ms=min(config.timeout_ms, 15000))

    emit("[2/5] Starting booking flow")
    move_and_click(page, page.get_by_role("button", name="Start Booking"), config)

    emit("[3/5] Waiting for captcha")
    wait_for_captcha(page, config)

    emit("[4/5] Filling captcha")
    fill_captcha(page, config)

    seats = jitter_seats(config.seats) if len(config.seats) > 1 else config.seats
    emit(f"[5/5] Selecting seats: {', '.join(seats)}")
    select_seats(page, seats, config)

    if config.confirm_booking:
        emit("[extra] Confirming booking")
        move_and_click(page, page.locator('[data-track-id="proceed-booking"]'), config)
        page.get_by_role("heading", name="Booking Confirmed").wait_for(state="visible", timeout=config.timeout_ms)
    else:
        page.locator('[data-track-id="proceed-booking"]').wait_for(state="visible", timeout=config.timeout_ms)

    emit(f"Run {attempt} completed successfully.")


def run_macro_sequence(configs: Iterable[MacroConfig], progress: ProgressCallback | None = None) -> int:
    """여러 config를 순차 실행한다. GUI의 랜덤 반복 실행에서 사용한다."""
    config_list = list(configs)
    if not config_list:
        return 0

    for attempt, config in enumerate(config_list, start=1):
        if progress:
            progress(f"=== Run {attempt}/{len(config_list)} ===")

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=config.headless, slow_mo=config.slow_mo_ms)
            try:
                context = browser.new_context(viewport={"width": 1440, "height": 1400})
                page = context.new_page()
                page.set_default_timeout(config.timeout_ms)
                run_single(page, config, attempt, progress)
                context.close()
                browser.close()
            except PlaywrightTimeoutError as error:
                message = f"Timeout while running macro: {error}"
                if progress:
                    progress(message)
                else:
                    print(message, file=sys.stderr)
                browser.close()
                return 1
            except Exception as error:  # noqa: BLE001
                message = f"Macro failed: {error}"
                if progress:
                    progress(message)
                else:
                    print(message, file=sys.stderr)
                browser.close()
                return 1

    return 0


def run_macro(config: MacroConfig) -> int:
    runs = [config_for_single_run(config) for _ in range(config.repeat)]
    return run_macro_sequence(runs)


if __name__ == "__main__":
    raise SystemExit(run_macro(parse_args()))
