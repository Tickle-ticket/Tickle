"""tickle-ticket.co.kr 오토마우스 v2 — 진짜 OS 마우스 이벤트 기반.

v1(Playwright 가상 마우스) vs v2(pyautogui 실제 마우스) => 해당 폴더 내에서는 macro_v2.py 를 macro.py 로 rename
  - DOM 읽기/페이지 이동 → Playwright 유지 (Next.js SPA 대응)
  - 마우스 이동/클릭 → pyautogui (실제 OS 레벨 이벤트)
  - 브라우저 창 위치를 JS로 읽어 viewport → 스크린 좌표 변환

사용법:
  python -m macro.browser_automation.tickle_ticket.macro_v2
  python -m macro.browser_automation.tickle_ticket.macro_v2 --repeat 5
  python -m macro.browser_automation.tickle_ticket.macro_v2 --preset human_like
"""
from __future__ import annotations

import argparse
import math
import random
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

TARGET_URL = "https://www.tickle-ticket.co.kr"

PRESETS = {
    "macro": dict(
        slow_mo_ms=5,
        action_delay_ms=10,
        hover_ms=10,
        typing_delay_ms=10,
        mouse_steps=4,
        bezier_spread=15.0,
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
    login_id: str = "nex7248@gmail.com"
    login_pw: str = "sJAVJG59f6gx2yu!!"
    event_index: int = 0


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

    # ── 단계별 흐름 ──────────────────────────────────────────
    def step_open(self, page: Page) -> None:
        self._emit(f"[1] 사이트 접속: {self.cfg.url}")
        page.goto(self.cfg.url, wait_until="domcontentloaded", timeout=self.cfg.timeout_ms)
        time.sleep(1.0)

    def step_login(self, page: Page) -> None:
        self._emit("[2] 로그인")
        # 페이지 이동은 Playwright로, 입력/제출만 pyautogui
        page.goto(f"{self.cfg.url}/login", wait_until="domcontentloaded", timeout=self.cfg.timeout_ms)
        time.sleep(0.8)

        id_input = page.locator(
            "input[type='email'], input[name*='id'], input[name*='email'], "
            "input[placeholder*='이메일'], input[placeholder*='아이디']"
        ).first
        self._type_text(page, id_input, self.cfg.login_id)
        _lognorm_delay(0.15, 0.4)

        pw_input = page.locator("input[type='password']").first
        self._type_text(page, pw_input, self.cfg.login_pw)
        _lognorm_delay(0.15, 0.4)

        submit = page.locator(
            "button[type='submit']:has-text('로그인'), button:has-text('로그인'), input[type='submit']"
        ).first
        self._click_locator(page, submit)
        page.wait_for_load_state("domcontentloaded", timeout=self.cfg.timeout_ms)

        try:
            page.wait_for_url(
                lambda url: "login" not in url and "signin" not in url,
                timeout=self.cfg.timeout_ms,
            )
        except PlaywrightTimeoutError:
            pass

        self._emit("  → 로그인 완료")
        time.sleep(0.5)

    def step_select_event(self, page: Page) -> None:
        self._emit("[3] 이벤트 선택")
        page.goto(self.cfg.url, wait_until="domcontentloaded", timeout=self.cfg.timeout_ms)
        time.sleep(1.0)

        for sel in ["[class*='event']", "[class*='EventCard']", "[class*='ticket-card']"]:
            items = page.locator(sel)
            count = items.count()
            if count == 0:
                continue
            checked = 0
            for i in range(count):
                try:
                    text = items.nth(i).inner_text().strip()
                    if len(text) < 3:
                        continue
                    if text in ['전체', '뮤지컬', '연극', '콘서트', '전시', '로그인', '로그아웃']:
                        continue
                    if checked >= self.cfg.event_index:
                        items.nth(i).scroll_into_view_if_needed()
                        time.sleep(0.3)
                        self._click_locator(page, items.nth(i))
                        page.wait_for_load_state("domcontentloaded", timeout=self.cfg.timeout_ms)
                        self._emit(f"  → 이벤트 클릭 ({sel}, idx={i})")
                        time.sleep(1.0)
                        return
                    checked += 1
                except Exception:
                    continue

        raise RuntimeError("이벤트 선택 실패")

    def step_click_booking_btn(self, page: Page) -> None:
        self._emit("[4] 예매하기 클릭")
        btn = page.locator("button:has-text('예매하기')").first
        btn.wait_for(state="visible", timeout=self.cfg.timeout_ms)
        self._click_locator(page, btn)
        page.wait_for_timeout(2000)

    def step_queue_skip(self, page: Page) -> None:
        self._emit("[5] 대기열 스킵")
        skipped = page.evaluate("""
            () => {
                const btn = [...document.querySelectorAll('button')].find(
                    b => b.innerText.includes('Test: Waitlist Book')
                );
                if (btn) { btn.click(); return true; }
                return false;
            }
        """)
        if skipped:
            self._emit("  → Test: Waitlist Book 클릭")
            page.wait_for_timeout(3000)

    def step_captcha(self, page: Page) -> None:
        """6단계: Canvas CAPTCHA — fillText 후킹으로 좌표 파악 → pyautogui 클릭."""
        self._emit("[6] CAPTCHA 처리 (오토마우스)")

        canvas_rect = page.evaluate("""
            () => {
                const c = document.querySelector('.fixed.inset-0.z-50 canvas');
                if (!c) return null;
                const r = c.getBoundingClientRect();
                return { x: r.x, y: r.y, w: r.width, h: r.height, lw: c.width, lh: c.height };
            }
        """)
        if not canvas_rect:
            self._emit("  → CAPTCHA 없음, 다음 단계")
            return

        cx, cy = canvas_rect['x'], canvas_rect['y']
        cw, ch = canvas_rect['w'], canvas_rect['h']
        lw, lh = canvas_rect['lw'], canvas_rect['lh']

        drawn = page.evaluate("() => window._captchaDrawn || []")
        seq_items = []
        grid_items: dict[str, tuple[float, float]] = {}

        for d in drawn:
            t = d['text'].strip()
            if not (t.isdigit() and len(t) == 1):
                continue
            if d['y'] < 150:
                seq_items.append((d['x'], t))
            else:
                grid_items[t] = (d['x'], d['y'])

        seq_items.sort(key=lambda x: x[0])
        seq = [s[1] for s in seq_items]

        if not seq:
            self._emit("  ⚠ CAPTCHA 순서 추출 실패")
            return

        self._emit(f"  → 순서: {' → '.join(seq)}")
        self._focus_browser(page)

        scale_x = cw / lw
        scale_y = ch / lh
        self._emit(f"  [canvas] rect=({cx:.0f},{cy:.0f},{cw:.0f}x{ch:.0f}) logical=({lw}x{lh}) scale=({scale_x:.3f},{scale_y:.3f})")

        for digit in seq:
            if digit not in grid_items:
                self._emit(f"  ⚠ '{digit}' 위치 없음")
                continue
            gx, gy = grid_items[digit]
            # canvas 논리 좌표 → 뷰포트 좌표
            vx = cx + gx * scale_x
            vy = cy + gy * scale_y
            sx, sy = self._to_screen(vx, vy)
            self._emit(f"  → '{digit}' 논리=({gx},{gy}) viewport=({vx:.0f},{vy:.0f}) screen=({sx:.0f},{sy:.0f})")
            # 뷰포트 → 스크린 → pyautogui 클릭
            self._click_viewport_pos(page, vx, vy)
            _lognorm_delay(0.3, 0.55)

        page.wait_for_timeout(3000)
        try:
            page.wait_for_function(
                "() => !document.querySelector('.fixed.inset-0.z-50 canvas')",
                timeout=10000,
            )
            self._emit("  → CAPTCHA 완료")
        except PlaywrightTimeoutError:
            self._emit("  → CAPTCHA 캔버스 타임아웃 — 계속 진행")
        page.wait_for_timeout(800)

    def step_booking_flow(self, page: Page) -> None:
        self._emit("[7] 날짜/회차 선택")

        # 날짜 '1' 클릭
        date_pos = page.evaluate("""
            () => {
                const overlay = document.querySelector('.fixed.inset-0.z-50');
                if (!overlay) return null;
                const candidates = [...overlay.querySelectorAll('*')].filter(el =>
                    (el.textContent || '').trim() === '1' && el.children.length === 0
                );
                for (const el of candidates) {
                    const par = el.parentElement;
                    const sibs = [...(par?.parentElement?.children || [])].map(c => (c.textContent||'').trim());
                    if (sibs.some(s => s === '2' || s === '7')) {
                        const r = el.getBoundingClientRect();
                        return { x: r.x + r.width/2, y: r.y + r.height/2 };
                    }
                }
                return null;
            }
        """)
        if date_pos:
            self._click_viewport_pos(page, date_pos['x'], date_pos['y'])
            self._emit(f"  → 날짜 '1' 클릭")
            page.wait_for_timeout(1500)

        # 회차 클릭
        session_clicked = page.evaluate("""
            () => {
                const els = [...document.querySelectorAll('button, [role=button], li')];
                for (const el of els) {
                    const t = (el.innerText || '').trim();
                    if (/\\d+회차|\\d{2}:\\d{2}/.test(t) && window.getComputedStyle(el).display !== 'none') {
                        el.click();
                        return t;
                    }
                }
                return null;
            }
        """)
        if session_clicked:
            self._emit(f"  → 회차 '{session_clicked}' 클릭")
            page.wait_for_timeout(1500)

    def step_before_payment(self, page: Page) -> None:
        self._emit("[8] 결제 직전 도달 확인")
        for sel in ["button:has-text('결제하기')", "[class*='payment']", "text=결제수단"]:
            try:
                page.locator(sel).first.wait_for(state="visible", timeout=5000)
                self._emit(f"  ✅ 결제 페이지 도달 ({sel}) — 중단")
                return
            except PlaywrightTimeoutError:
                continue
        self._emit(f"  현재 URL: {page.url}")

    def run_once(self, page: Page, attempt: int) -> None:
        self._emit(f"\n{'='*40}")
        self._emit(f"  Run {attempt} (오토마우스 v2)")
        self._emit(f"{'='*40}")
        self.step_open(page)
        self.step_login(page)
        self.step_select_event(page)
        self.step_click_booking_btn(page)
        self.step_queue_skip(page)
        self.step_captcha(page)
        self.step_booking_flow(page)
        self.step_before_payment(page)
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
_CANVAS_HOOK_JS = """
    (function() {
        window._captchaDrawn = [];
        const _orig = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
            window._captchaDrawn.push({ text: String(text), x: Math.round(x), y: Math.round(y) });
            return maxWidth !== undefined ? _orig.call(this, text, x, y, maxWidth) : _orig.call(this, text, x, y);
        };
    })();
"""


# ── CLI ───────────────────────────────────────────────────────
def parse_args() -> Config:
    p = argparse.ArgumentParser(description="tickle-ticket 오토마우스 v2 (pyautogui)")
    p.add_argument("--url", default=TARGET_URL)
    p.add_argument("--repeat", type=int, default=1)
    p.add_argument("--timeout-ms", type=int, default=20000)
    p.add_argument("--preset", choices=list(PRESETS.keys()), default=None)
    p.add_argument("--login-id", default="nex7248@gmail.com")
    p.add_argument("--login-pw", default="sJAVJG59f6gx2yu!!")
    p.add_argument("--event-index", type=int, default=0)
    p.add_argument("--collector-api-url", default="http://127.0.0.1:8000")
    args = p.parse_args()

    base = dict(PRESETS[args.preset]) if args.preset else dict(PRESETS["macro"])
    return Config(
        url=args.url,
        headless=False,   # 오토마우스는 화면 필요
        repeat=max(1, args.repeat),
        timeout_ms=args.timeout_ms,
        login_id=args.login_id,
        login_pw=args.login_pw,
        event_index=args.event_index,
        collector_api_url=args.collector_api_url,
        **base,
    )


def run_macro(config: Config) -> int:
    if config.collector_api_url:
        _enqueue_labels(config.collector_api_url, config.repeat)

    exit_code = 0
    for attempt in range(1, config.repeat + 1):
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=False,   # 오토마우스: 반드시 headless=False
                slow_mo=config.slow_mo_ms,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--window-size=1440,900",   # 실제 창 크기 고정
                    "--window-position=50,50",  # 알려진 위치에 창 배치
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
                ctx.add_init_script(_CANVAS_HOOK_JS)
                page = ctx.new_page()
                page.set_default_timeout(config.timeout_ms)

                macro = TickleMacroV2(config)
                macro.run_once(page, attempt)

                ctx.close()
            except Exception as e:
                print(f"[ERROR] {e}", file=sys.stderr)
                exit_code = 1
            finally:
                browser.close()

        if exit_code != 0:
            break

    return exit_code


if __name__ == "__main__":
    raise SystemExit(run_macro(parse_args()))
