"""PyAutoGUI Lv2 매크로: 좌표 노이즈, 랜덤 딜레이, 베지어 커브 이동."""
# isort: skip_file  # ensure_dpi_aware()는 pyautogui import 전에 실행되어야 함
import random
import time

from macro.mouse_automation._dpi import ensure_dpi_aware, scale_coords

ensure_dpi_aware()
import pyautogui

from macro.base import BaseMacro
from macro.mouse_automation.mouse_utils import bezier_curve, add_noise, random_delay, human_like_duration


class PyAutoGUILv2(BaseMacro):
    """
    Lv2 회피 매크로:
    - 좌표에 가우시안 노이즈 추가
    - 액션 간 랜덤 딜레이 (로그정규분포)
    - 마우스 이동 시 베지어 곡선 경로
    """

    @property
    def source_name(self) -> str:
        return "pyautogui_lv2"

    def execute(self):
        cfg = self.config.get("macro", {}).get("lv2", {})
        min_delay = cfg.get("min_delay", 0.1)
        max_delay = cfg.get("max_delay", 0.8)
        noise_sigma = cfg.get("coord_noise_sigma", 4)
        bezier_pts = cfg.get("bezier_points", 20)
        bezier_spread = cfg.get("bezier_spread", 80)
        base_w, base_h = self.base_resolution

        pyautogui.FAILSAFE = self.config.get("pyautogui", {}).get("failsafe", True)
        pyautogui.PAUSE = self.config.get("pyautogui", {}).get("pause", 0.01)

        actions = self.target.get("actions", [])
        current_pos = pyautogui.position()

        for action in actions:
            action_type = action["type"]

            if action_type == "click":
                coords = action.get("coords")
                if coords:
                    # 기준 좌표 -> 실제 좌표 -> 노이즈 추가
                    target_x, target_y = scale_coords(coords[0], coords[1], base_w, base_h)
                    target_x, target_y = add_noise(target_x, target_y, sigma=noise_sigma)

                    # 베지어 곡선으로 이동
                    start = (current_pos[0], current_pos[1])
                    path = bezier_curve(
                        start, (target_x, target_y),
                        num_points=bezier_pts,
                        spread=bezier_spread,
                    )

                    dist = ((target_x - start[0])**2 + (target_y - start[1])**2) ** 0.5
                    total_duration = human_like_duration(dist)
                    step_time = total_duration / max(len(path), 1)

                    for px, py in path:
                        pyautogui.moveTo(px, py, duration=0)
                        self.logger.log("mouse_move", x=px, y=py)
                        time.sleep(step_time)

                    # 클릭
                    pyautogui.click(target_x, target_y)
                    self.logger.log("mouse_click", x=target_x, y=target_y, button="left")
                    current_pos = (target_x, target_y)

            elif action_type == "type":
                text = action.get("text", "")
                for char in text:
                    pyautogui.press(char)
                    self.logger.log("key_down", key=char)
                    self.logger.log("key_up", key=char)
                    # 글자 간 랜덤 딜레이 (50~200ms)
                    time.sleep(random.uniform(0.05, 0.2))

            # 액션 간 랜덤 딜레이
            random_delay(min_delay, max_delay)
