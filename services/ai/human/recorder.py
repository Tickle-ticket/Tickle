"""사람 행동 데이터 수집기. pynput으로 마우스/키보드 글로벌 캡처."""
import time
import threading
import webbrowser

from pynput import mouse, keyboard

from utils.logging.session import Session
from utils.logging.event_logger import EventLogger

# F9 키 반복 방지용 최소 간격 (초)
TOGGLE_DEBOUNCE_SEC = 0.5
# 마우스 이동 이벤트 쓰로틀링 간격 (초) - 너무 빈번한 이벤트 방지
MOUSE_MOVE_THROTTLE_SEC = 0.01  # 10ms = 최대 100 이벤트/초


class HumanRecorder:
    """
    실제 사람의 마우스/키보드 행동을 기록.
    F9로 녹화 시작/중지.
    """

    def __init__(self, base_dir: str = "data/raw"):
        self.session = Session(source="human", label=1)
        self.logger = EventLogger(self.session, base_dir=base_dir)
        self._recording = False
        self._mouse_listener = None
        self._keyboard_listener = None
        self._stop_event = threading.Event()
        self._last_toggle_time = 0.0
        self._last_mouse_move_time = 0.0

    def start(self, url: str = None):
        """녹화 시작. URL이 주어지면 브라우저를 열어줌."""
        if url:
            webbrowser.open(url)
            print(f"브라우저에서 열림: {url}")

        print("=" * 50)
        print("사람 행동 녹화기")
        print("=" * 50)
        print("F9: 녹화 시작/중지")
        print("F10: 종료")
        print("=" * 50)

        # 키보드 리스너 (핫키 감지)
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

    def _toggle_recording(self):
        # 키 반복에 의한 연속 토글 방지
        now = time.monotonic()
        if now - self._last_toggle_time < TOGGLE_DEBOUNCE_SEC:
            return
        self._last_toggle_time = now

        if not self._recording:
            self._recording = True
            self.session.start()
            print("\n[REC] 녹화 시작! 자연스럽게 웹사이트를 사용하세요.")
        else:
            self._recording = False
            self.session.end()
            self.logger.flush()
            print(f"\n[STOP] 녹화 중지. 이벤트 저장됨.")

    def _on_key_press(self, key):
        try:
            if key == keyboard.Key.f9:
                self._toggle_recording()
                return
            if key == keyboard.Key.f10:
                now = time.monotonic()
                if now - self._last_toggle_time < TOGGLE_DEBOUNCE_SEC:
                    return
                self._last_toggle_time = now
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
        # 쓰로틀링: 너무 빈번한 마우스 이동 이벤트 제한
        now = time.monotonic()
        if now - self._last_mouse_move_time < MOUSE_MOVE_THROTTLE_SEC:
            return
        self._last_mouse_move_time = now
        self.logger.log("mouse_move", x=x, y=y)

    def _on_mouse_click(self, x, y, button, pressed):
        if not self._recording:
            return
        if pressed:
            btn = "left" if button == mouse.Button.left else "right"
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
