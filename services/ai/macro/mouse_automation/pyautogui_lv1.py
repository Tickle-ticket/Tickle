"""PyAutoGUI Lv1 매크로 — 탐지 난이도 최하 샘플 (baseline).

위치: 매크로 탐지 모델 학습에서 "가장 쉬운 공격" 클래스.
모델이 이것도 못 잡으면 심각한 구조 문제. sanity check 용.

특징:
  - 고정 좌표 (YAML 지정) 로 `pyautogui.moveTo(duration=0)` → 순간이동
  - mousemove 이벤트 생성되지 않음 (경로 없음)
  - 일정 `interval=0.5s` 간격으로 액션
  - 타이핑은 `pyautogui.press()` 로 순간 입력 (hold ~10ms)

대비 매크로:
  - Lv2 (pyautogui_lv2): bezier + 노이즈 (중간 난이도)
  - automouse (automouse.py): 사용자 시퀀스 + 동일 Lv1 kinematics

탐지 핵심 시그널: 경로 속도 0 (mousemove 부재), 일정한 dt, 좌표 완전 일치.
"""
# isort: skip_file  # ensure_dpi_aware()는 pyautogui import 전에 실행되어야 함
import time

from macro.mouse_automation._dpi import ensure_dpi_aware, scale_coords

# DPI 인식을 PyAutoGUI import 전에 설정
ensure_dpi_aware()
import pyautogui

from macro.base import BaseMacro


class PyAutoGUILv1(BaseMacro):
    """
    Lv1 기본 매크로:
    - 고정 좌표로 즉시 이동 + 클릭
    - 일정한 간격(interval)으로 액션 수행
    - 타이핑은 한 번에 입력 (instant)
    """

    @property
    def source_name(self) -> str:
        return "pyautogui_lv1"

    def execute(self):
        cfg = self.config.get("macro", {}).get("lv1", {})
        interval = cfg.get("interval", 0.5)
        base_w, base_h = self.base_resolution

        pyautogui.FAILSAFE = self.config.get("pyautogui", {}).get("failsafe", True)
        pyautogui.PAUSE = self.config.get("pyautogui", {}).get("pause", 0.01)

        actions = self.target.get("actions", [])

        for action in actions:
            action_type = action["type"]

            if action_type == "click":
                coords = action.get("coords")
                if coords:
                    x, y = scale_coords(coords[0], coords[1], base_w, base_h)
                    pyautogui.moveTo(x, y, duration=0)
                    self.logger.log("mouse_move", x=x, y=y)
                    pyautogui.click(x, y)
                    self.logger.log("mouse_click", x=x, y=y, button="left")

            elif action_type == "type":
                text = action.get("text", "")
                for char in text:
                    pyautogui.press(char) if len(char) == 1 else pyautogui.press(char)
                    self.logger.log("key_down", key=char)
                    self.logger.log("key_up", key=char)

            time.sleep(interval)
