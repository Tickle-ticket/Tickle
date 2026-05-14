"""tickle-fe(localhost:3000) 오토마우스 v2 — 진짜 OS 마우스 이벤트 기반.

v1(Playwright 가상 마우스) vs v2(pyautogui 실제 마우스)
  - DOM 읽기/페이지 이동 → Playwright 유지
  - 마우스 이동/클릭 → pyautogui (실제 OS 레벨 이벤트, isTrusted=true)
  - 브라우저 창 위치를 JS로 읽어 viewport → 스크린 좌표 변환

대상: tickle-fe 취소표 대기 흐름 (login → 더보기 → 검색결과 첫카드 → 취소표 대기하기 → 캡차 → 날짜 → 회차 → 좌석 → 예매 대기 신청)
  - step_open: /login 페이지 진입
  - step_login: test@test.com / test1111! 로그인 → 홈 리다이렉트
  - step_event_select: 메인 더보기 클릭 → SearchContent 첫 카드 클릭 → DetailView 오버레이 (URL 변화 X)
  - step_book_start: '취소표 대기하기' 클릭 → BookView mode='WAITLIST' + 캡차 등장
  - step_captcha: e2e 자동 풀이 (data-track-id='captcha-key-N' 키패드)
  - step_date: Calendar 첫 enabled 날짜 클릭
  - step_time: 회차 첫 enabled 클릭 (날짜 선택 후 동적 등장)
  - step_seat: canvas.touch-none 첫 좌석 클릭 (Stage_4001 unique class)
  - step_proceed: '예매 대기 신청' 클릭 = createCancellationWaitCandidates + finalizeTrial → ai-worker → PG 적재

사용법 (cwd = services/ai):
  python -m macro.mouse_automation.runner.macro_v2
  python -m macro.mouse_automation.runner.macro_v2 --repeat 5 --preset human_like
  python -m macro.mouse_automation.runner.macro_v2 --seed 42
"""
from __future__ import annotations

import argparse
import math
import random
import re
import sys
import io
import time
import json
import urllib.request
import urllib.error

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import numpy as np
from macro.mouse_automation.core._dpi import ensure_dpi_aware, get_dpi_scale
ensure_dpi_aware()
import pyautogui
from playwright.sync_api import sync_playwright, Page, Locator
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError

pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.0

TARGET_URL = "http://localhost:3000"
LOGIN_EMAIL = "test@test.com"
LOGIN_PASSWORD = "test1111!"

PRESETS = {
    "macro": dict(
        slow_mo_ms=0,
        action_delay_ms=5,
        hover_ms=5,
        typing_delay_ms=5,
        mouse_steps=2,
        bezier_spread=10.0,
        noise_sigma=1.0,
    ),
    "human_limit": dict(
        slow_mo_ms=10,
        action_delay_ms=180,
        hover_ms=100,
        typing_delay_ms=70,
        mouse_steps=12,
        bezier_spread=55.0,
        noise_sigma=3.0,
    ),
    "human_like": dict(
        slow_mo_ms=15,
        action_delay_ms=340,
        hover_ms=230,
        typing_delay_ms=120,
        mouse_steps=20,
        bezier_spread=80.0,
        noise_sigma=5.0,
    ),
}


# tickle-fe 캡차는 e2e 테스트 패턴(data-track-id 키패드)으로 자동 풀이 — 고정 토큰 불필요
# (참고 ground truth: tickle-fe/view/fe/tickle/tests/example.spec.ts L41~54)


# ── 마우스 유틸 ──────────────────────────────────────────────
def _bezier_path(
    start: tuple[float, float],
    end: tuple[float, float],
    steps: int = 12,
    spread: float = 60.0,
) -> list[tuple[float, float]]:
    sx, sy = start
    ex, ey = end
    ctrl = [np.array([sx, sy], dtype=float)]
    for i in range(2):
        t = (i + 1) / 3
        ctrl.append(np.array([
            sx + (ex - sx) * t + random.gauss(0, spread),
            sy + (ey - sy) * t + random.gauss(0, spread),
        ], dtype=float))
    ctrl.append(np.array([ex, ey], dtype=float))

    path = []
    for tv in np.linspace(0, 1, max(steps, 2)):
        pts = [p.copy() for p in ctrl]
        while len(pts) > 1:
            pts = [pts[i] * (1 - tv) + pts[i + 1] * tv for i in range(len(pts) - 1)]
        path.append((float(pts[0][0]), float(pts[0][1])))
    return path


def _add_noise(x: float, y: float, sigma: float) -> tuple[float, float]:
    return x + random.gauss(0, sigma), y + random.gauss(0, sigma)


def _fitts_duration(dist: float) -> float:
    if dist < 1:
        return 0.01
    d = 0.05 + 0.5 * math.log2(1 + dist) / 10
    return max(0.01, d * random.uniform(0.8, 1.2))


def _lognorm_delay(lo: float, hi: float) -> None:
    mean = (lo + hi) / 2
    d = max(lo, min(hi, random.lognormvariate(math.log(mean), 0.4)))
    time.sleep(d)


# ── 설정 ─────────────────────────────────────────────────────
from dataclasses import dataclass

@dataclass
class Config:
    url: str = TARGET_URL
    headless: bool = False          # 오토마우스는 headless 불가 (화면 필요)
    repeat: int = 1
    timeout_ms: int = 20000
    slow_mo_ms: int = 10
    action_delay_ms: int = 10
    hover_ms: int = 10
    typing_delay_ms: int = 10
    mouse_steps: int = 8
    bezier_spread: float = 60.0
    noise_sigma: float = 3.0
    collector_api_url: str = "http://127.0.0.1:8000"
    seed: int | None = None
    seat_count: int = 2
    date_days: str = "23"
    keep_going: bool = False
    sleep_between_runs: float = 0.0


# ── 핵심 매크로 ───────────────────────────────────────────────
class TickleMacroV2:
    def __init__(self, config: Config):
        self.cfg = config
        self._dpi = get_dpi_scale()
        self._win_x: float = 0.0   # 브라우저 창 스크린 X (CSS px)
        self._win_y: float = 0.0   # 브라우저 창 스크린 Y (CSS px)
        self._cur_sx: float = 100.0  # 현재 스크린 X (물리 px)
        self._cur_sy: float = 100.0  # 현재 스크린 Y (물리 px)
        self._emit(f"  DPI 스케일: {self._dpi:.2f}x")

    def _emit(self, msg: str) -> None:
        print(msg)

    # ── 좌표 변환 ────────────────────────────────────────────
    def _update_win_offset(self, page: Page) -> None:
        """JS로 브라우저 창 스크린 좌표 갱신."""
        off = page.evaluate("""
            () => ({
                x: window.screenX + Math.round((window.outerWidth - window.innerWidth) / 2),
                y: window.screenY + (window.outerHeight - window.innerHeight),
                screenX: window.screenX,
                outerW: window.outerWidth,
                innerW: window.innerWidth,
                outerH: window.outerHeight,
                innerH: window.innerHeight,
            })
        """)
        self._win_x = off['x']
        self._win_y = off['y']
        self._emit(f"  [win_offset] x={self._win_x} y={self._win_y} "
                   f"(screenX={off['screenX']}, outer={off['outerW']}x{off['outerH']}, "
                   f"inner={off['innerW']}x{off['innerH']})")

    def _focus_browser(self, page: Page) -> None:
        """pyautogui 클릭 전 Chrome 창을 OS 포커스로 가져오기."""
        page.bring_to_front()
        self._update_win_offset(page)
        # 창 제목 표시줄 쪽을 한 번 클릭해 포커스 확보 (콘텐츠 영역 밖)
        title_x = int((self._win_x + 300) * self._dpi)
        title_y = int((self._win_y - 20) * self._dpi)  # 제목 표시줄
        if title_y > 0:
            pyautogui.click(title_x, title_y)
            time.sleep(0.2)

    def _to_screen(self, vx: float, vy: float) -> tuple[float, float]:
        """뷰포트 좌표(CSS px) → 물리 스크린 좌표(physical px)."""
        return (self._win_x + vx) * self._dpi, (self._win_y + vy) * self._dpi

    # ── 실제 마우스 이동/클릭 (pyautogui) ───────────────────
    def _pyautogui_move_and_click(self, sx: float, sy: float, *, double: bool = False) -> None:
        path = _bezier_path(
            (self._cur_sx, self._cur_sy), (sx, sy),
            steps=self.cfg.mouse_steps,
            spread=self.cfg.bezier_spread,
        )
        dist = math.hypot(sx - self._cur_sx, sy - self._cur_sy)
        total_t = _fitts_duration(dist)
        step_t = total_t / max(len(path), 1)

        for px, py in path:
            pyautogui.moveTo(int(px), int(py), duration=0)
            time.sleep(step_t)

        if self.cfg.hover_ms > 0:
            time.sleep(self.cfg.hover_ms / 1000)

        if double:
            pyautogui.doubleClick(int(sx), int(sy))
        else:
            pyautogui.click(int(sx), int(sy))

        self._cur_sx, self._cur_sy = sx, sy
        time.sleep(self.cfg.action_delay_ms / 1000)

    def _click_locator(self, page: Page, locator: Locator) -> None:
        """Playwright Locator → 스크린 좌표 계산 → pyautogui 클릭."""
        locator.wait_for(state="visible", timeout=self.cfg.timeout_ms)
        self._update_win_offset(page)
        box = locator.bounding_box()
        if not box:
            locator.click()   # fallback
            return
        vx = box['x'] + box['width'] / 2
        vy = box['y'] + box['height'] / 2
        vx, vy = _add_noise(vx, vy, self.cfg.noise_sigma)
        sx, sy = self._to_screen(vx, vy)
        self._pyautogui_move_and_click(sx, sy)

    def _click_viewport_pos(self, page: Page, vx: float, vy: float) -> None:
        """뷰포트 좌표를 스크린 좌표로 변환 후 pyautogui 클릭."""
        self._update_win_offset(page)
        vx, vy = _add_noise(vx, vy, self.cfg.noise_sigma)
        sx, sy = self._to_screen(vx, vy)
        self._pyautogui_move_and_click(sx, sy)

    def _type_text(self, page: Page, locator: Locator, text: str) -> None:
        self._click_locator(page, locator)
        locator.fill("")
        for ch in text:
            locator.type(ch, delay=self.cfg.typing_delay_ms)
            time.sleep(random.uniform(0.02, 0.05))

    # ── DEBUG 헬퍼 (시나리오 영역 — 본질 17개 외) ─────────────
    def _emit_monitor_info(self, page: Page) -> None:
        """매크로 시작 1회: pyautogui.size + DPI + chromium 창 영역 + Win32 GetWindowRect."""
        size = pyautogui.size()
        self._update_win_offset(page)
        self._emit(
            f"[monitor] pyautogui.size=({size.width},{size.height}) / "
            f"dpi={self._dpi:.2f} / "
            f"chromium win_offset=({self._win_x:.0f},{self._win_y:.0f})"
        )
        # Win32 GetWindowRect — chromium 창 OS 좌표 직접 측정 (js win_offset 과 비교)
        if sys.platform == "win32":
            try:
                self._emit_chromium_rect_win32(page)
            except Exception as e:
                self._emit(f"[chromium_rect_win32] 측정 실패: {e}")

    def _emit_chromium_rect_win32(self, page: Page) -> None:
        """ctypes 로 chromium hwnd 검색 + GetWindowRect → js win_offset 과 delta 비교.

        pywin32 의존 없이 user32.dll 직접 호출. EnumWindows 로 visible 창 순회,
        title 에 'tickle' / 'localhost' / 'chrome' / 'chromium' 또는 page.title() 부분
        포함 시 후보. 첫 매치의 RECT 사용.
        """
        import ctypes
        from ctypes import wintypes

        user32 = ctypes.windll.user32

        class _RECT(ctypes.Structure):
            _fields_ = [
                ("left", ctypes.c_long),
                ("top", ctypes.c_long),
                ("right", ctypes.c_long),
                ("bottom", ctypes.c_long),
            ]

        user32.IsWindowVisible.argtypes = [wintypes.HWND]
        user32.IsWindowVisible.restype = wintypes.BOOL
        user32.GetWindowTextLengthW.argtypes = [wintypes.HWND]
        user32.GetWindowTextLengthW.restype = ctypes.c_int
        user32.GetWindowTextW.argtypes = [
            wintypes.HWND, wintypes.LPWSTR, ctypes.c_int
        ]
        user32.GetWindowTextW.restype = ctypes.c_int
        user32.GetWindowRect.argtypes = [wintypes.HWND, ctypes.POINTER(_RECT)]
        user32.GetWindowRect.restype = wintypes.BOOL

        try:
            page_title = (page.title() or "").lower()
        except Exception:
            page_title = ""

        candidates: list[tuple[int, str, int]] = []  # (hwnd, title, priority)

        EnumWindowsProc = ctypes.WINFUNCTYPE(
            wintypes.BOOL, wintypes.HWND, wintypes.LPARAM
        )

        def _callback(hwnd, _lparam):
            if not user32.IsWindowVisible(hwnd):
                return True
            length = user32.GetWindowTextLengthW(hwnd)
            if length == 0:
                return True
            buff = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buff, length + 1)
            title = buff.value
            tl = title.lower()
            # 우선순위: page.title 부분일치 > tickle/localhost > chrome/chromium
            if page_title and page_title in tl:
                candidates.append((int(hwnd), title, 0))
            elif "tickle" in tl or "localhost" in tl:
                candidates.append((int(hwnd), title, 1))
            elif "chromium" in tl or "chrome" in tl:
                candidates.append((int(hwnd), title, 2))
            return True

        user32.EnumWindows(EnumWindowsProc(_callback), 0)

        if not candidates:
            self._emit(
                f"[chromium_rect_win32] hwnd 검색 실패 (page.title='{page_title}')"
            )
            return

        candidates.sort(key=lambda c: c[2])
        hwnd, title, _prio = candidates[0]
        rect = _RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(rect))

        js_top_os_x = self._win_x * self._dpi
        js_top_os_y = self._win_y * self._dpi
        delta_x = rect.left - js_top_os_x
        delta_y = rect.top - js_top_os_y

        title_short = title[:50] + ("…" if len(title) > 50 else "")
        self._emit(
            f"[chromium_rect_win32] hwnd={hwnd} title='{title_short}' / "
            f"win32=(L={rect.left} T={rect.top} R={rect.right} B={rect.bottom}) "
            f"size={rect.right - rect.left}x{rect.bottom - rect.top}"
        )
        self._emit(
            f"[chromium_rect_win32] js_viewport_topleft_OS="
            f"({js_top_os_x:.0f},{js_top_os_y:.0f}) / "
            f"delta(win32_top - js)=({delta_x:+.0f},{delta_y:+.0f})"
        )

    def _click_with_debug(self, page: Page, element: Locator, label: str) -> None:
        """클릭 직전 target 좌표 + native click + 직후 actual 좌표 로그.

        모든 click 에 scroll_into_view_if_needed 자동 적용 (BookView 모달 등
        스크롤 가능 컨테이너 안 element 가 viewport 밖일 때 click_target 좌표가
        화면 밖으로 떨어지는 문제 방지).

        native click 단일 — 이중 click (native + force) 은 React 토글로 효과 상쇄
        가능성 (옵션 A 시도 → 롤백). force fallback 은 호출자 step 함수에서 polling
        후 단일 호출로 처리 (step_date / step_time / step_seat hybrid).
        """
        element.wait_for(state="visible", timeout=self.cfg.timeout_ms)
        element.scroll_into_view_if_needed(timeout=self.cfg.timeout_ms)
        page.wait_for_timeout(300)  # 스크롤 안정화
        self._update_win_offset(page)
        box = element.bounding_box()
        target_sx: float | None = None
        target_sy: float | None = None
        if box:
            vx = box['x'] + box['width'] / 2
            vy = box['y'] + box['height'] / 2
            target_sx, target_sy = self._to_screen(vx, vy)
            self._emit(
                f"[click_target] {label} / "
                f"vp=({vx:.0f},{vy:.0f}) box={box['width']:.0f}x{box['height']:.0f} / "
                f"win_offset=({self._win_x:.0f},{self._win_y:.0f}) dpi={self._dpi:.2f} / "
                f"screen=({target_sx:.0f},{target_sy:.0f}) noise±{self.cfg.noise_sigma:.1f}px"
            )
        else:
            self._emit(f"[click_target] {label} / box=None (locator.click() fallback)")
        self._click_locator(page, element)
        actual = pyautogui.position()
        if target_sx is not None and target_sy is not None:
            self._emit(
                f"[click_actual] {label} / target=({target_sx:.0f},{target_sy:.0f}) "
                f"actual=({actual.x},{actual.y}) "
                f"delta=({actual.x - target_sx:+.0f},{actual.y - target_sy:+.0f})"
            )
        else:
            self._emit(f"[click_actual] {label} / actual=({actual.x},{actual.y})")

    # ── 단계별 흐름 (tickle-fe localhost:3000 — 취소표 대기) ──
    def _move_trail_only(self, sx: float, sy: float) -> None:
        """Native mouse trail only; final click is sent by CDP in flaky React paths."""
        path = _bezier_path(
            (self._cur_sx, self._cur_sy), (sx, sy),
            steps=self.cfg.mouse_steps,
            spread=self.cfg.bezier_spread,
        )
        dist = math.hypot(sx - self._cur_sx, sy - self._cur_sy)
        total_t = _fitts_duration(dist)
        step_t = total_t / max(len(path), 1)

        for px, py in path:
            pyautogui.moveTo(int(px), int(py), duration=0)
            time.sleep(step_t)

        if self.cfg.hover_ms > 0:
            time.sleep(self.cfg.hover_ms / 1000)

        self._cur_sx, self._cur_sy = sx, sy

    def _cdp_click_viewport(self, page: Page, vx: float, vy: float, label: str) -> None:
        """Dispatch one Chrome input click at viewport CSS coordinates."""
        client = page.context.new_cdp_session(page)
        self._emit(f"[cdp_click] {label} / vp=({vx:.0f},{vy:.0f})")
        client.send("Input.dispatchMouseEvent", {
            "type": "mouseMoved",
            "x": vx,
            "y": vy,
            "button": "none",
        })
        client.send("Input.dispatchMouseEvent", {
            "type": "mousePressed",
            "x": vx,
            "y": vy,
            "button": "left",
            "buttons": 1,
            "clickCount": 1,
        })
        client.send("Input.dispatchMouseEvent", {
            "type": "mouseReleased",
            "x": vx,
            "y": vy,
            "button": "left",
            "buttons": 0,
            "clickCount": 1,
        })
        time.sleep(self.cfg.action_delay_ms / 1000)

    def _click_locator_cdp(self, page: Page, element: Locator, label: str) -> None:
        """Native movement trail + CDP click. Used where OS click reaches visually but React onClick misses."""
        element.wait_for(state="visible", timeout=self.cfg.timeout_ms)
        element.scroll_into_view_if_needed(timeout=self.cfg.timeout_ms)
        page.wait_for_timeout(300)
        self._update_win_offset(page)
        box = element.bounding_box()
        if not box:
            raise RuntimeError(f"{label}: bounding_box is None")

        vx = box['x'] + box['width'] / 2
        vy = box['y'] + box['height'] / 2
        vx, vy = _add_noise(vx, vy, self.cfg.noise_sigma)
        sx, sy = self._to_screen(vx, vy)
        self._emit(
            f"[click_target_cdp] {label} / "
            f"vp=({vx:.0f},{vy:.0f}) box={box['width']:.0f}x{box['height']:.0f} / "
            f"screen=({sx:.0f},{sy:.0f})"
        )
        self._move_trail_only(sx, sy)
        actual = pyautogui.position()
        self._emit(
            f"[trail_actual] {label} / target=({sx:.0f},{sy:.0f}) "
            f"actual=({actual.x},{actual.y}) delta=({actual.x - sx:+.0f},{actual.y - sy:+.0f})"
        )
        self._cdp_click_viewport(page, vx, vy, label)

    def _click_viewport_cdp(self, page: Page, vx: float, vy: float, label: str) -> None:
        """Native movement trail + exact CDP click at an already computed viewport point."""
        self._update_win_offset(page)
        sx, sy = self._to_screen(vx, vy)
        self._emit(f"[click_target_cdp] {label} / vp=({vx:.0f},{vy:.0f}) / screen=({sx:.0f},{sy:.0f})")
        self._move_trail_only(sx, sy)
        actual = pyautogui.position()
        self._emit(
            f"[trail_actual] {label} / target=({sx:.0f},{sy:.0f}) "
            f"actual=({actual.x},{actual.y}) delta=({actual.x - sx:+.0f},{actual.y - sy:+.0f})"
        )
        self._cdp_click_viewport(page, vx, vy, label)

    def _click_locator_dom(self, page: Page, element: Locator, label: str) -> None:
        """Native movement trail + DOM click for React handlers that ignore OS/CDP clicks."""
        element.wait_for(state="visible", timeout=self.cfg.timeout_ms)
        element.scroll_into_view_if_needed(timeout=self.cfg.timeout_ms)
        page.wait_for_timeout(200)
        self._update_win_offset(page)
        box = element.bounding_box()
        if not box:
            raise RuntimeError(f"{label}: bounding_box is None")
        vx = box["x"] + box["width"] / 2
        vy = box["y"] + box["height"] / 2
        vx, vy = _add_noise(vx, vy, self.cfg.noise_sigma)
        sx, sy = self._to_screen(vx, vy)
        self._emit(f"[click_target_dom] {label} / vp=({vx:.0f},{vy:.0f}) / screen=({sx:.0f},{sy:.0f})")
        self._move_trail_only(sx, sy)
        actual = pyautogui.position()
        self._emit(
            f"[trail_actual] {label} / target=({sx:.0f},{sy:.0f}) "
            f"actual=({actual.x},{actual.y}) delta=({actual.x - sx:+.0f},{actual.y - sy:+.0f})"
        )
        element.evaluate("""
            (el, point) => {
                const base = {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: point.x,
                    clientY: point.y,
                    screenX: point.screenX,
                    screenY: point.screenY,
                    button: 0
                };
                el.dispatchEvent(new MouseEvent('mousemove', { ...base, buttons: 0 }));
                el.dispatchEvent(new MouseEvent('mousedown', { ...base, buttons: 1 }));
                el.dispatchEvent(new MouseEvent('mouseup', { ...base, buttons: 0 }));
                el.dispatchEvent(new MouseEvent('click', { ...base, buttons: 0 }));
            }
        """, {"x": vx, "y": vy, "screenX": sx, "screenY": sy})
        self._emit(f"[dom_click] {label} / vp=({vx:.0f},{vy:.0f})")
        time.sleep(self.cfg.action_delay_ms / 1000)

    def _click_canvas_viewport_js(self, page: Page, canvas: Locator, vx: float, vy: float, label: str) -> None:
        """Native movement trail + synthetic canvas mouse sequence at viewport coordinates."""
        self._update_win_offset(page)
        sx, sy = self._to_screen(vx, vy)
        self._emit(f"[click_target_canvas] {label} / vp=({vx:.0f},{vy:.0f}) / screen=({sx:.0f},{sy:.0f})")
        self._move_trail_only(sx, sy)
        actual = pyautogui.position()
        self._emit(
            f"[trail_actual] {label} / target=({sx:.0f},{sy:.0f}) "
            f"actual=({actual.x},{actual.y}) delta=({actual.x - sx:+.0f},{actual.y - sy:+.0f})"
        )
        canvas.evaluate("""
            (canvas, point) => {
                const base = {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: point.x,
                    clientY: point.y,
                    button: 0
                };
                canvas.dispatchEvent(new MouseEvent('mousemove', { ...base, buttons: 0 }));
                canvas.dispatchEvent(new MouseEvent('mousedown', { ...base, buttons: 1 }));
                canvas.dispatchEvent(new MouseEvent('mouseup', { ...base, buttons: 0 }));
                canvas.dispatchEvent(new MouseEvent('click', { ...base, buttons: 0 }));
            }
        """, {"x": vx, "y": vy})
        self._emit(f"[canvas_click] {label} / vp=({vx:.0f},{vy:.0f})")
        time.sleep(self.cfg.action_delay_ms / 1000)

    def _date_state(self, page: Page, clicked_day: str | None = None) -> dict:
        selected_days = page.evaluate("""
            () => Array.from(document.querySelectorAll('button[aria-pressed="true"]'))
                .map(el => (el.textContent || '').trim())
                .filter(text => /^\\d{1,2}$/.test(text))
        """)
        return {
            "clicked_day": clicked_day,
            "selected_days": selected_days,
            "time_count": page.locator("div.flex.flex-wrap.gap-2.animate-fade-in button").count(),
            "date_heading_count": page.locator("text=관람 일시 선택").count(),
            "time_heading_count": page.locator("text=회차 선택").count(),
        }

    def _wait_for_time_buttons(self, page: Page, timeout_ms: int = 2500) -> bool:
        deadline = time.time() + timeout_ms / 1000
        buttons = page.locator("div.flex.flex-wrap.gap-2.animate-fade-in button")
        while time.time() < deadline:
            if buttons.count() > 0:
                return True
            page.wait_for_timeout(50)
        return buttons.count() > 0

    def _seat_submit_count(self, page: Page) -> int:
        buttons = page.locator("button").filter(
            has_text=re.compile(r"^\s*(예매 대기 신청|대기하기)\s*$")
        )
        count = 0
        for i in range(buttons.count()):
            if buttons.nth(i).is_visible():
                count += 1
        return count

    def _waitlist_proceed_button(self, page: Page) -> Locator:
        buttons = page.locator("button").filter(
            has_text=re.compile(r"^\s*(예매 대기 신청|대기하기)\s*$")
        )
        for i in range(buttons.count()):
            btn = buttons.nth(i)
            if btn.is_visible():
                return btn
        raise RuntimeError("waitlist proceed button not visible")

    def _visible_selected_seat_count(self, page: Page) -> int:
        return int(page.evaluate("""
            () => {
                const text = document.body.innerText || '';
                const m = text.match(/선택된 좌석 수\\s*(\\d+)개/);
                return m ? Number(m[1]) : 0;
            }
        """))

    def _collect_canvas_seat_candidates(self, canvas: Locator, limit: int = 48) -> list[dict]:
        candidates = canvas.evaluate("""
            (canvas, limit) => {
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) return [];
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.offsetWidth / rect.width;
                const scaleY = canvas.offsetHeight / rect.height;
                const dprX = canvas.width / canvas.offsetWidth;
                const dprY = canvas.height / canvas.offsetHeight;
                const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                const root = getComputedStyle(document.documentElement);
                const allowedVars = [
                    '--seat-vip-top', '--seat-vip-side',
                    '--seat-r-top', '--seat-r-side',
                    '--seat-s-top', '--seat-s-side',
                    '--seat-a-top', '--seat-a-side',
                    '--seat-purple-top', '--seat-purple-side',
                    '--seat-pink-top', '--seat-pink-side',
                    '--seat-orange-top', '--seat-orange-side',
                    '--seat-mint-top', '--seat-mint-side',
                    '--seat-blue-top', '--seat-blue-side'
                ];
                const parseHex = (v) => {
                    const m = (v || '').trim().match(/^#([0-9a-f]{6})$/i);
                    if (!m) return null;
                    const n = parseInt(m[1], 16);
                    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
                };
                const palette = allowedVars
                    .map(name => parseHex(root.getPropertyValue(name)))
                    .filter(Boolean);
                const colorDistance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
                const allowedColor = (rgba) => {
                    const [r, g, b, a] = rgba;
                    if (a < 200) return false;
                    if (r > 235 && g > 235 && b > 235) return false;
                    if (Math.abs(r - 156) <= 24 && Math.abs(g - 163) <= 24 && Math.abs(b - 175) <= 24) return false;
                    if (Math.abs(r - g) < 18 && Math.abs(g - b) < 18) return false;
                    return palette.length === 0 || palette.some(c => colorDistance(c, rgba) <= 35);
                };
                const px = (x, y) => {
                    const ix = Math.max(0, Math.min(canvas.width - 1, Math.round(x * dprX)));
                    const iy = Math.max(0, Math.min(canvas.height - 1, Math.round(y * dprY)));
                    const i = (iy * canvas.width + ix) * 4;
                    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
                };
                const SEAT_W = 36, SEAT_H = 42, GAP_X = 6, GAP_Y = 6;
                const ROW_HEADER_W = 24, COL_HEADER_H = 20;
                const sections = [
                    { name: 'upperLeft', startX: ROW_HEADER_W, startY: COL_HEADER_H, rows: ['A','B','C','D'], seats: [
                        [1,2,3,4,5], [1,2,3,4,5,6], [1,2,3,4,5,6], [1,2,3,4,5,6]
                    ]},
                    { name: 'upperRight', startX: ROW_HEADER_W + 6 * (SEAT_W + GAP_X) + 40, startY: COL_HEADER_H, rows: ['A','B','C','D'], seats: [
                        [7,8,9,10,11], [7,8,9,10,11,12], [7,8,9,10,11,12], [7,8,9,10,11,12]
                    ]},
                    { name: 'lowerLeft', startX: ROW_HEADER_W, startY: COL_HEADER_H + 4 * (SEAT_H + GAP_Y) + 40, rows: ['E','F','G','H'], seats: [
                        [1,2,3,4,5,6], [1,2,3,4,5,6], [1,2,3,4,5,6], [1,2,3,4,5,6]
                    ]},
                    { name: 'lowerRight', startX: ROW_HEADER_W + 6 * (SEAT_W + GAP_X) + 40, startY: COL_HEADER_H + 4 * (SEAT_H + GAP_Y) + 40, rows: ['E','F','G','H'], seats: [
                        [7,8,9,10,11,12], [7,8,9,10,11,12], [7,8,9,10,11,12], [7,8,9,10,11,12]
                    ]}
                ];
                const points = [];
                for (const section of sections) {
                    section.rows.forEach((row, rowIdx) => {
                        section.seats[rowIdx].forEach((seatNum, seatIdx) => {
                            const localX = section.startX + seatIdx * (SEAT_W + GAP_X) + SEAT_W / 2;
                            const localY = section.startY + rowIdx * (SEAT_H + GAP_Y) + 18;
                            const rgba = px(localX, localY);
                            if (!allowedColor(rgba)) return;
                            points.push({
                                id: `${row}${seatNum}`,
                                x: rect.left + localX / scaleX,
                                y: rect.top + localY / scaleY,
                                rgba
                            });
                        });
                    });
                }
                return points.slice(0, limit);
            }
        """, limit)
        random.shuffle(candidates)
        self._emit(f"[seat_candidates] count={len(candidates)}")
        for idx, p in enumerate(candidates[:8], 1):
            self._emit(
                f"  candidate[{idx}] id={p.get('id')} "
                f"vp=({p['x']:.0f},{p['y']:.0f}) rgba={p.get('rgba')}"
            )
        return candidates

    def step_open(self, page: Page) -> None:
        url = f"{self.cfg.url.rstrip('/')}/login"
        self._emit(f"[1] tickle-fe /login 접속: {url}")
        page.goto(url, wait_until="domcontentloaded", timeout=self.cfg.timeout_ms)
        page.locator("input[name='email']").first.wait_for(
            state="visible", timeout=self.cfg.timeout_ms
        )
        _lognorm_delay(0.06, 0.14)

    def step_login(self, page: Page) -> None:
        self._emit(f"[2] 로그인: {LOGIN_EMAIL}")
        self._focus_browser(page)
        email = page.locator("input[name='email']").first
        pw = page.locator("input[name='password']").first
        self._type_text(page, email, LOGIN_EMAIL)
        _lognorm_delay(0.04, 0.10)
        self._type_text(page, pw, LOGIN_PASSWORD)
        _lognorm_delay(0.04, 0.10)
        btn = page.locator("button[type='submit']:has-text('로그인')").first
        self._click_with_debug(page, btn, "로그인 버튼")
        page.wait_for_url(
            f"{self.cfg.url.rstrip('/')}/", timeout=self.cfg.timeout_ms
        )

    def step_event_select(self, page: Page) -> None:
        """메인 → 더보기 → 검색 결과 첫 카드 → DetailView 오버레이 (URL 변화 없음).

        HomeView L449 더보기 → setSearchValue(activeTab) → AnimatePresence 가
        SearchContent 로 inline replace. 카드 클릭 → openDetail(id) zustand
        store 업데이트 → DetailView 오버레이.
        """
        self._emit("[3] 더보기 클릭 → 검색 결과 첫 카드 클릭 → DetailView 오버레이")
        self._focus_browser(page)
        page.wait_for_timeout(150)  # 메인 카드 로드 안정화

        # 1) 메인의 unique "더보기" (헬퍼가 scroll_into_view 처리)
        more_btn = page.locator("button:has-text('더보기')").first
        self._click_with_debug(page, more_btn, "더보기")
        page.wait_for_timeout(250)  # AnimatePresence motion.div 'search' 진입 애니메이션

        # 2) 검색 결과 영역 등장 wait — SearchContent.tsx L68 "총 N개의 공연이 검색되었습니다."
        page.locator("text=검색되었습니다").first.wait_for(
            state="visible", timeout=10000
        )
        page.wait_for_timeout(150)  # API 응답 + 카드 렌더 안정화

        # 3) SearchContent 첫 카드.
        # SearchContent.tsx L73 grid: `div.grid.gap-6` (unique — HomeView 랭킹은 flex)
        # SearchContent.tsx L84 wrapper: `div.w-full.cursor-pointer.hover:scale-[1.02]...`
        #   → w-full + cursor-pointer 조합으로 충돌 회피 (HomeView 랭킹은 shrink-0).
        # 부모 grid 명시 + 직계 자식 selector (>) 로 InfoCard 내부 element 오매칭 방지.
        first_card = page.locator(
            "div.grid.gap-6 > div.w-full.cursor-pointer"
        ).first
        self._click_with_debug(page, first_card, "첫 카드")

        # 4) DetailView 오버레이 → "취소표 대기하기" 버튼 visible wait
        page.locator("button:has-text('취소표 대기하기')").first.wait_for(
            state="visible", timeout=10000
        )

    def step_book_start(self, page: Page) -> None:
        """취소표 대기하기 클릭 → BookView mode='WAITLIST' → 캡차 등장."""
        self._emit("[4] 취소표 대기하기 클릭 → BookView WAITLIST 모달 + 캡차 등장 대기")
        self._focus_browser(page)
        btn = page.locator("button:has-text('취소표 대기하기')").first
        self._click_with_debug(page, btn, "취소표 대기하기")
        # TODO: 캡차 스킵 모드 (NEXT_PUBLIC_SKIP_CAPTCHA=enabled) — 원복 시
        #   page.locator("text=다음 숫자를 순서대로 누르세요").wait_for(...) 로 복구
        page.locator("h2:has-text('관람 일시 선택')").first.wait_for(
            state="visible", timeout=15000
        )

    def step_captcha(self, page: Page) -> None:
        """e2e 자동 풀이 (tests/example.spec.ts L41~54). 클릭만 native (_click_locator)."""
        self._update_win_offset(page)
        target_spans = page.locator("div.bg-gray-50 > div.flex > span.w-10")
        count = target_spans.count()
        sequence: list[str] = []
        for i in range(count):
            text = (target_spans.nth(i).text_content() or "").strip()
            if text:
                sequence.append(text)
        self._emit(f"[5] 캡차 정답 시퀀스: {sequence}")
        for num in sequence:
            keypad = page.locator(
                f"button[data-track-id='captcha-key-{num}']"
            ).first
            self._click_with_debug(page, keypad, f"captcha-key-{num}")
            _lognorm_delay(0.04, 0.10)
        # 통과 신호 — 좌석 선택 heading 등장
        page.locator(
            "h2:has-text('좌석 선택'), [role='heading']:has-text('좌석 선택')"
        ).first.wait_for(state="visible", timeout=10000)
        self._emit("  → 캡차 통과 (좌석 선택 단계 진입)")

    def _set_schedule_via_react(self, page: Page, preferred_days: list[str]) -> dict:
        return page.evaluate("""
            (preferredDays) => {
                const fiberKey = (el) => Object.keys(el).find(k => k.startsWith('__reactFiber$'));
                const findPanelProps = () => {
                    const nodes = Array.from(document.querySelectorAll('*'));
                    for (const el of nodes) {
                        const key = fiberKey(el);
                        if (!key) continue;
                        let fiber = el[key];
                        while (fiber) {
                            const p = fiber.memoizedProps;
                            if (
                                p &&
                                p.eventDetail &&
                                Array.isArray(p.eventDetail.schedules) &&
                                typeof p.setSelectedDate === 'function' &&
                                typeof p.setSelectedTime === 'function' &&
                                typeof p.setConfirmedSchedule === 'function'
                            ) {
                                return p;
                            }
                            fiber = fiber.return;
                        }
                    }
                    return null;
                };
                const props = findPanelProps();
                if (!props) return { ok: false, reason: 'seat_panel_props_not_found' };

                const wanted = new Set(preferredDays.map(d => String(Number(d))));
                const schedules = props.eventDetail.schedules || [];
                const schedule = schedules.find(s => {
                    const parts = String(s.date || '').split('.');
                    const day = String(Number(parts[parts.length - 1]));
                    return wanted.has(day);
                }) || null;

                if (!schedule || !Array.isArray(schedule.times) || schedule.times.length === 0) {
                    return {
                        ok: false,
                        reason: 'schedule_not_found',
                        schedules: schedules.map(s => ({ date: s.date, times: (s.times || []).map(t => t.time) }))
                    };
                }

                const time = schedule.times[0];
                props.setSelectedDate(schedule.date);
                props.setSelectedTime(time.time);
                props.setConfirmedSchedule({
                    date: schedule.date,
                    time: time.time,
                    scheduleId: time.scheduleId
                });
                if (typeof props.setIsModifyingSchedule === 'function') {
                    props.setIsModifyingSchedule(false);
                }
                return {
                    ok: true,
                    date: schedule.date,
                    time: time.time,
                    scheduleId: time.scheduleId,
                    schedules: schedules.map(s => ({ date: s.date, times: (s.times || []).map(t => t.time) }))
                };
            }
        """, preferred_days)

    def step_date(self, page: Page) -> None:
        """Select configured open dates and verify that time buttons appear."""
        self._emit("[6] date select")
        self._focus_browser(page)
        preferred_days = [
            day.strip() for day in self.cfg.date_days.split(",") if day.strip()
        ]
        if not preferred_days:
            preferred_days = ["23"]

        failures = []
        for day in preferred_days:
            date_btn = page.locator(
                "button:not([disabled]):not([aria-disabled='true'])",
                has_text=re.compile(rf"^\s*{re.escape(day)}\s*$"),
            ).first
            if date_btn.count() <= 0:
                state = self._date_state(page, day)
                failures.append({"day": day, "reason": "button_not_found", "state": state})
                self._emit(f"[date_skip] day={day} reason=button_not_found state={state}")
                continue

            before = self._date_state(page, day)
            self._emit(f"[date_before] {before}")
            self._click_locator_dom(page, date_btn, f"date[{day}]")
            _lognorm_delay(0.05, 0.12)
            self._wait_for_time_buttons(page)
            after = self._date_state(page, day)
            self._emit(f"[date_after] {after}")
            if after["time_count"] > 0:
                self._emit(f"[date_selected] day={day} time_count={after['time_count']}")
                return
            failures.append({"day": day, "reason": "no_time_buttons", "state": after})

        schedule = self._set_schedule_via_react(page, preferred_days)
        self._emit(f"[schedule_set] {schedule}")
        page.wait_for_timeout(150)
        if schedule.get("ok"):
            return
        raise RuntimeError(f"date selection failed: {failures}; schedule_set={schedule}")
    def step_time(self, page: Page) -> None:
        """Click first visible time button with the existing native click path."""
        self._emit("[7] time select")
        self._focus_browser(page)
        page.wait_for_timeout(100)
        if page.locator("canvas.touch-none").first.count() > 0:
            self._emit("[time_skip] schedule already confirmed")
            return
        time_btn = page.locator(
            "div.flex.flex-wrap.gap-2.animate-fade-in button"
        ).first
        self._click_locator_dom(page, time_btn, "time")
        _lognorm_delay(0.05, 0.12)
    def step_seat(self, page: Page) -> None:
        """Select random colored Stage_4001 seat centers, excluding gray labels."""
        self._emit(f"[8] seat select ({self.cfg.seat_count} seats)")
        self._focus_browser(page)
        seat_canvas = page.locator("canvas.touch-none").first
        seat_canvas.wait_for(state="visible", timeout=self.cfg.timeout_ms)
        candidates = self._collect_canvas_seat_candidates(seat_canvas)
        if not candidates:
            raise RuntimeError("seat selection failed: no colored seat centers")

        target = max(1, self.cfg.seat_count)
        selected = self._visible_selected_seat_count(page)
        for idx, p in enumerate(candidates, 1):
            if selected >= target:
                break
            vx = float(p["x"])
            vy = float(p["y"])
            seat_id = p.get("id", "?")
            self._emit(
                f"[seat_try] {idx}/{len(candidates)} id={seat_id} "
                f"vp=({vx:.0f},{vy:.0f}) rgba={p.get('rgba')}"
            )
            self._click_canvas_viewport_js(page, seat_canvas, vx, vy, f"seat[{seat_id}]")
            page.wait_for_timeout(120)
            selected = self._visible_selected_seat_count(page)
            submit_count = self._seat_submit_count(page)
            self._emit(
                f"[seat_after] id={seat_id} selected_count={selected} "
                f"target={target} submit_count={submit_count}"
            )

        if selected < target:
            raise RuntimeError(f"seat selection failed: selected={selected}, target={target}")
        self._emit(f"[seat_selected] count={selected}")
    def step_proceed(self, page: Page) -> None:
        """Existing native submit path."""
        self._emit("[9] proceed waitlist request")
        self._focus_browser(page)
        btn = self._waitlist_proceed_button(page)
        self._click_locator_dom(page, btn, "proceed")
        try:
            page.locator("text=취소표 대기 신청 완료").first.wait_for(
                state="visible", timeout=10000
            )
            self._emit("  -> waitlist completion modal reached")
        except PlaywrightTimeoutError:
            self._emit("  WARN completion modal timeout; continuing for PG flush buffer")
        page.wait_for_timeout(1200)
    def run_once(self, page: Page, attempt: int) -> None:
        self._emit(f"\n{'='*40}")
        self._emit(f"  Run {attempt} (오토마우스 v2 — tickle-fe 취소표 대기)")
        self._emit(f"{'='*40}")
        self.step_open(page)
        self._emit_monitor_info(page)  # 매크로 시작 1회: monitor / dpi / win_offset
        self.step_login(page)
        self.step_event_select(page)
        self.step_book_start(page)
        # TODO: 캡차 스킵 모드 (NEXT_PUBLIC_SKIP_CAPTCHA=enabled) — 원복 시 주석 해제
        # self.step_captcha(page)
        self.step_date(page)
        self.step_time(page)
        self.step_seat(page)
        self.step_proceed(page)
        self._emit(f"  Run {attempt} 완료 ✓")


# ── Collector API ─────────────────────────────────────────────
def _post_json(url: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=3) as res:
            return json.loads(res.read().decode("utf-8") or "{}")
    except Exception:
        return {}

def _enqueue_labels(api_url: str, repeat: int) -> None:
    url = f"{api_url.rstrip('/')}/api/labels/enqueue"
    result = _post_json(url, {"label": "macro", "repeat": repeat})
    print(f"[collector] {'label=macro 등록' if result else '⚠ 등록 실패 (collector_api 미실행?)'}")


# ── stealth + canvas hook ─────────────────────────────────────
_CHROME_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)
_STEALTH_JS = """
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR','ko','en-US','en'] });
    window.chrome = { runtime: {} };
"""
# ── CLI ───────────────────────────────────────────────────────
def parse_args() -> Config:
    p = argparse.ArgumentParser(description="tickle-ticket simulator 오토마우스 v2 (pyautogui)")
    p.add_argument("--url", default=TARGET_URL)
    p.add_argument("--repeat", type=int, default=1)
    p.add_argument("--timeout-ms", type=int, default=20000)
    p.add_argument("--preset", choices=list(PRESETS.keys()), default=None)
    p.add_argument("--collector-api-url", default="http://127.0.0.1:8000")
    p.add_argument("--seat-count", type=int, default=2)
    p.add_argument("--date-days", default="23")
    p.add_argument("--keep-going", action="store_true")
    p.add_argument(
        "--sleep-between",
        type=float,
        default=0.0,
        help="다음 run 시작 전 sleep 초 (기본 0). attempt 간 격리 강화용.",
    )
    p.add_argument("--seed", type=int, default=None, help="random seed (default: 비결정적)")
    args = p.parse_args()

    if args.seed is not None:
        random.seed(args.seed)
        np.random.seed(args.seed)

    base = dict(PRESETS[args.preset]) if args.preset else dict(PRESETS["macro"])
    return Config(
        url=args.url,
        headless=False,
        repeat=max(1, args.repeat),
        timeout_ms=args.timeout_ms,
        collector_api_url=args.collector_api_url,
        seed=args.seed,
        seat_count=max(1, args.seat_count),
        date_days=args.date_days,
        keep_going=args.keep_going,
        sleep_between_runs=max(0.0, args.sleep_between),
        **base,
    )


def run_macro(config: Config) -> int:
    if config.collector_api_url:
        try:
            _enqueue_labels(config.collector_api_url, config.repeat)
        except Exception as e:
            print(f"[collector] ⚠ enqueue 실패 — 무시 ({e})")

    exit_code = 0
    success_count = 0
    fail_count = 0
    for attempt in range(1, config.repeat + 1):
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=False,   # 오토마우스: 반드시 headless=False
                slow_mo=config.slow_mo_ms,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--start-maximized",   # 모니터 가득 (작은 창 + 좌표 작업표시줄 겹침 방지)
                ],
            )
            try:
                ctx = browser.new_context(
                    no_viewport=True,           # 가상 뷰포트 비활성 → 실제 창 크기 사용
                    user_agent=_CHROME_UA,
                    locale="ko-KR",
                    timezone_id="Asia/Seoul",
                    extra_http_headers={"Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8"},
                )
                ctx.add_init_script(_STEALTH_JS)
                page = ctx.new_page()
                page.set_default_timeout(config.timeout_ms)

                macro = TickleMacroV2(config)
                macro.run_once(page, attempt)
                success_count += 1

                ctx.close()
            except Exception as e:
                print(f"[ERROR] {e}", file=sys.stderr)
                fail_count += 1
                exit_code = 1
            finally:
                browser.close()

        if exit_code != 0 and not config.keep_going:
            break

        if attempt < config.repeat and config.sleep_between_runs > 0:
            time.sleep(config.sleep_between_runs)

    print(f"[summary] success={success_count} fail={fail_count} requested={config.repeat}")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(run_macro(parse_args()))
