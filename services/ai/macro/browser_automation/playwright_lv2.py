"""Playwright Lv2 매크로: 랜덤 딜레이, 좌표 노이즈, 인간 모사 타이핑."""
import random
import time

from playwright.sync_api import sync_playwright

from macro.base import BaseMacro
from macro.mouse_automation.mouse_utils import bezier_curve, random_delay, human_like_duration
from macro.browser_automation.playwright_lv1 import EVENT_CAPTURE_SCRIPT


class PlaywrightLv2(BaseMacro):
    """
    Lv2 회피 Playwright 매크로:
    - 요소 바운딩 박스 내 랜덤 위치 클릭
    - 베지어 곡선 마우스 이동 (page.mouse.move)
    - 글자별 랜덤 딜레이 타이핑
    - 액션 간 랜덤 대기
    """

    @property
    def source_name(self) -> str:
        return "playwright_lv2"

    def execute(self):
        cfg = self.config.get("macro", {}).get("lv2", {})
        min_delay = cfg.get("min_delay", 0.1)
        max_delay = cfg.get("max_delay", 0.8)
        noise_sigma = cfg.get("coord_noise_sigma", 4)
        bezier_pts = cfg.get("bezier_points", 20)
        bezier_spread = cfg.get("bezier_spread", 80)
        pw_cfg = self.config.get("playwright", {})
        viewport = pw_cfg.get("viewport", [1280, 720])

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=pw_cfg.get("headless", False))
            context = browser.new_context(
                viewport={"width": viewport[0], "height": viewport[1]},
            )
            page = context.new_page()
            page.add_init_script(EVENT_CAPTURE_SCRIPT)

            url = self.target.get("url", "")
            if url:
                page.goto(url, wait_until="domcontentloaded")
                page.wait_for_timeout(1000)

            actions = self.target.get("actions", [])
            current_x, current_y = viewport[0] // 2, viewport[1] // 2

            for action in actions:
                action_type = action["type"]
                selector = action.get("selector", "")

                if action_type == "click" and selector:
                    # 요소 바운딩 박스 내 랜덤 위치 계산
                    locator = page.locator(selector)
                    box = locator.bounding_box()
                    if box:
                        # 바운딩 박스 중심 근처 랜덤 위치
                        target_x = box["x"] + random.uniform(
                            box["width"] * 0.2, box["width"] * 0.8
                        )
                        target_y = box["y"] + random.uniform(
                            box["height"] * 0.2, box["height"] * 0.8
                        )

                        # 베지어 곡선 이동
                        path = bezier_curve(
                            (int(current_x), int(current_y)),
                            (int(target_x), int(target_y)),
                            num_points=bezier_pts,
                            spread=bezier_spread,
                        )

                        dist = ((target_x - current_x)**2 + (target_y - current_y)**2) ** 0.5
                        total_dur = human_like_duration(dist)
                        step_ms = int(total_dur * 1000 / max(len(path), 1))

                        for px, py in path:
                            page.mouse.move(px, py)
                            self.logger.log("mouse_move", x=px, y=py)
                            page.wait_for_timeout(max(step_ms, 1))

                        page.mouse.click(target_x, target_y)
                        self.logger.log("mouse_click", x=int(target_x), y=int(target_y), button="left")
                        current_x, current_y = target_x, target_y
                    else:
                        locator.click()

                elif action_type == "type" and selector:
                    # 포커스 클릭 후 글자별 타이핑
                    locator = page.locator(selector)
                    locator.click()
                    text = action.get("text", "")
                    for char in text:
                        page.keyboard.press(char)
                        self.logger.log("key_down", key=char)
                        self.logger.log("key_up", key=char)
                        page.wait_for_timeout(random.randint(50, 200))

                # 브라우저 이벤트 수집
                self._collect_browser_events(page)

                # 랜덤 딜레이
                random_delay(min_delay, max_delay)

            self._collect_browser_events(page)
            browser.close()

    def _collect_browser_events(self, page):
        """브라우저에서 캡처된 이벤트를 EventLogger로 전송."""
        try:
            events = page.evaluate("window.__eventLog.splice(0)")
        except Exception:
            return

        for evt in events:
            event_type_map = {
                "mousemove": "mouse_move",
                "click": "mouse_click",
                "keydown": "key_down",
                "keyup": "key_up",
                "scroll": "mouse_scroll",
            }
            event_type = event_type_map.get(evt.get("type"), evt.get("type"))
            self.logger.log(
                event_type,
                x=evt.get("x"),
                y=evt.get("y"),
                button="left" if evt.get("button") == 0 else None,
                key=evt.get("key"),
            )
