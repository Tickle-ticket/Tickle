"""PyAutoGUI PoC.

실행: python docs/poc/mouse/poc_pyautogui.py

확인 사항:
- 좌표 정밀도 (float 지원 여부)
- 이동 속도 제어 (tween 옵션, duration)
- 마우스 위치 읽기
- 이벤트 주입 레벨 (Windows: ctypes user32.SetCursorPos + mouse_event)
"""
import time

import pyautogui

from .common import countdown, test_path


def main() -> None:
    print("=== PyAutoGUI PoC ===")
    print(f"version: {pyautogui.__version__}")
    print(f"screen size: {pyautogui.size()}")
    print(f"FAILSAFE (왼쪽상단 모서리로 가면 중지): {pyautogui.FAILSAFE}")
    print(f"PAUSE (각 action 후 대기): {pyautogui.PAUSE}s")

    # 정밀도: float 좌표 받으나 내부적으로 int로 변환됨
    target_float = (123.7, 245.3)
    print(f"\n[정밀도 테스트] float ({target_float}) 입력 시 실제 이동 좌표:")
    pyautogui.moveTo(target_float[0], target_float[1], duration=0.3)
    time.sleep(0.2)
    actual = pyautogui.position()
    print(f"  요청: {target_float}  →  실제: {actual}")
    print(f"  → PyAutoGUI 는 float 받으나 int 로 반올림 (소수점 손실)")

    countdown(3)

    # 경로 이동 테스트: 50개 포인트 직선 이동
    path = test_path((100, 100), (800, 600), n_steps=50)
    print(f"[경로 이동] {len(path)}개 포인트, 포인트당 10ms 예정")
    t0 = time.monotonic()
    for x, y in path:
        pyautogui.moveTo(x, y, _pause=False)  # _pause=False 로 PAUSE 비활성
    t1 = time.monotonic()
    print(f"  총 소요: {(t1-t0)*1000:.0f}ms (평균 포인트당 {(t1-t0)*1000/len(path):.1f}ms)")

    # tween 함수로 곡선 이동 테스트
    print("\n[tween 테스트] easeInOutQuad 로 (100,700)→(800,100) 이동 (duration 1.5s)")
    pyautogui.moveTo(800, 100, duration=1.5, tween=pyautogui.easeInOutQuad)

    # 클릭 테스트
    print("\n[클릭 이벤트 주입] — 실제 클릭이 일어나므로 생략 (실험 시 활성화)")
    # pyautogui.click()

    print("\n=== PyAutoGUI 특성 ===")
    print("  - 좌표: int 만 실제 사용 (float 입력 → 반올림)")
    print("  - 속도: duration + tween 으로 제어 (내장 easings: linear/easeInQuad/easeOutQuad 등)")
    print("  - 주입: Windows user32.SetCursorPos + mouse_event (유저 레벨)")
    print("  - DPI: SetProcessDpiAwareness 안 부르면 좌표가 논리 좌표 기준")
    print("  - 설치: pip install pyautogui (ez)")
    print("  - 단점: 곡선 커스터마이징 제한, 고정밀도 float 불가, 탐지 회피 낮음")


if __name__ == "__main__":
    main()
