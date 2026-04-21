"""사람 행동 데이터 수집기. pynput으로 마우스/키보드 글로벌 캡처.

녹화 시작 트리거 (2026-04-21 변경):
- 프로그램 실행 시 리스너 활성화만 되고 녹화는 대기 상태
- **첫 mouse click 감지 시 자동으로 세션 시작** — F9 같은 인위적 트리거 제거
  (F9 키 입력 자체가 데이터에 섞여 오염되는 문제 해결)
- F10 으로 종료
"""
import threading
import time
import webbrowser

from pynput import mouse, keyboard

from utils.logging.session import Session
from utils.logging.event_logger import EventLogger

# 마우스 이동 이벤트 쓰로틀링 (초) — 너무 빈번한 이벤트 제한
MOUSE_MOVE_THROTTLE_SEC = 0.01  # 10ms = 최대 100 이벤트/초


class HumanRecorder:
    """
    실제 사람의 마우스/키보드 행동을 기록.
    첫 click 에 자동 시작, F10 으로 종료.
    """

    def __init__(self, base_dir: str = "data/raw"):
        self.session = Session(source="human", label="human")
        self.logger = EventLogger(self.session, base_dir=base_dir)
        self._recording = False
        self._mouse_listener = None
        self._keyboard_listener = None
        self._stop_event = threading.Event()
        self._last_mouse_move_time = 0.0

    def start(self, url: str = None):
        """녹화 대기 시작. URL 이 주어지면 브라우저를 열어줌."""
        if url:
            webbrowser.open(url)
            print(f"브라우저에서 열림: {url}")

        print("=" * 50)
        print("사람 행동 녹화기")
        print("=" * 50)
        print("첫 마우스 클릭 감지 시 자동 녹화 시작")
        print("F10: 종료")
        print("=" * 50)

        self._keyboard_listener = keyboard.Listener(
            on_press=self._on_key_press,
            on_release=self._on_key_release,
        )
        self._mouse_listener = mouse.Listener(
            on_move=self._on_mouse_move,
            on_click=self._on_mouse_click,
            on_scroll=self._on_mouse_scroll,
        )

        self._keyboard_listener.start()
        self._mouse_listener.start()

        # 메인 스레드에서 대기
        self._stop_event.wait()

        self._keyboard_listener.stop()
        self._mouse_listener.stop()
        self.logger.flush()

        print(f"\n녹화 완료!")
        print(f"  세션: {self.session.session_id}")
        print(f"  소요: {self.session.duration_ms:.0f}ms")
        print(f"  로그: {self.logger.file_path}")

    def _on_key_press(self, key):
        try:
            if key == keyboard.Key.f10:
                if self._recording:
                    self._recording = False
                    self.session.end()
                    self.logger.flush()
                self._stop_event.set()
                return
        except AttributeError:
            pass

        if not self._recording:
            return
        key_name = self._key_to_str(key)
        self.logger.log("key_down", key=key_name)

    def _on_key_release(self, key):
        if not self._recording:
            return
        key_name = self._key_to_str(key)
        self.logger.log("key_up", key=key_name)

    def _on_mouse_move(self, x, y):
        if not self._recording:
            return
        now = time.monotonic()
        if now - self._last_mouse_move_time < MOUSE_MOVE_THROTTLE_SEC:
            return
        self._last_mouse_move_time = now
        self.logger.log("mouse_move", x=x, y=y)

    def _on_mouse_click(self, x, y, button, pressed):
        btn = "left" if button == mouse.Button.left else "right"

        # 첫 클릭 감지 → 자동 녹화 시작
        if not self._recording and pressed:
            self._recording = True
            self.session.start()
            print("\n[REC] 첫 클릭 감지 — 녹화 시작!")
            # 이 클릭도 의미 있는 이벤트이므로 함께 기록
            self.logger.log("mouse_click", x=x, y=y, button=btn)
            return

        if not self._recording:
            return
        if pressed:
            self.logger.log("mouse_click", x=x, y=y, button=btn)

    def _on_mouse_scroll(self, x, y, dx, dy):
        if not self._recording:
            return
        self.logger.log("mouse_scroll", x=x, y=y)

    @staticmethod
    def _key_to_str(key) -> str:
        try:
            return key.char if key.char else str(key)
        except AttributeError:
            return str(key).replace("Key.", "")
