"""Playwright Lv1 매크로: 셀렉터 기반, 고정 타이밍, JS 이벤트 캡처."""
import time

from playwright.sync_api import sync_playwright

from macro.base import BaseMacro


# 브라우저 내 이벤트 캡처용 JS
EVENT_CAPTURE_SCRIPT = """
window.__eventLog = [];
const _push = (evt) => {
    const entry = {
        ts: performance.now(),
        type: evt.type,
        x: evt.clientX ?? null,
        y: evt.clientY ?? null,
        button: evt.button ?? null,
        key: evt.key ?? null,
    };
    window.__eventLog.push(entry);
};
document.addEventListener('mousemove', _push);
document.addEventListener('click', _push);
document.addEventListener('keydown', _push);
document.addEventListener('keyup', _push);
document.addEventListener('scroll', (e) => {
    window.__eventLog.push({
        ts: performance.now(),
        type: 'scroll',
        x: window.scrollX,
        y: window.scrollY,
    });
});
"""


class PlaywrightLv1(BaseMacro):
    """
    Lv1 기본 Playwright 매크로:
    - 셀렉터로 직접 요소 선택
    - 고정 타이밍으로 액션 수행
    - JS를 주입하여 브라우저 내 이벤트 캡처
    """

    @property
    def source_name(self) -> str:
        return "playwright_lv1"

    def execute(self):
        cfg = self.config.get("macro", {}).get("lv1", {})
        interval = cfg.get("interval", 0.5)
        pw_cfg = self.config.get("playwright", {})
        viewport = pw_cfg.get("viewport", [1280, 720])

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=pw_cfg.get("headless", False))
            context = browser.new_context(
                viewport={"width": viewport[0], "height": viewport[1]},
            )
            page = context.new_page()

            # JS 이벤트 캡처 주입
            page.add_init_script(EVENT_CAPTURE_SCRIPT)

            # URL 이동
            url = self.target.get("url", "")
            if url:
                page.goto(url, wait_until="domcontentloaded")
                page.wait_for_timeout(1000)

            actions = self.target.get("actions", [])

            for action in actions:
                action_type = action["type"]
                selector = action.get("selector", "")

                if action_type == "click" and selector:
                    page.locator(selector).click()

                elif action_type == "type" and selector:
                    page.locator(selector).fill(action.get("text", ""))

                # 브라우저 이벤트 로그 수집
                self._collect_browser_events(page)

                time.sleep(interval)

            # 최종 이벤트 수집
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
