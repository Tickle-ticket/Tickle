"""pynput PoC.

실행: python docs/poc/mouse/poc_pynput.py

확인 사항:
- 좌표 정밀도
- 이동 속도 제어 (수동 구현 필요)
- 전역 마우스/키보드 리스너 동시 지원 (사람 녹화기에 이미 활용 중)
"""
import time

from pynput.mouse import Controller, Button

from .common import countdown, test_path


def main() -> None:
    print("=== pynput PoC ===")
    mouse = Controller()
    print(f"현재 위치: {mouse.position}")

    # 정밀도 테스트
    target_float = (123.7, 245.3)
    print(f"\n[정밀도 테스트] float {target_float} 입력 시:")
    mouse.position = target_float
    time.sleep(0.2)
    print(f"  요청: {target_float}  →  실제: {mouse.position}")
    print(f"  → pynput 은 float 받으나 int 로 변환됨")

    countdown(3)

    # 경로 이동 테스트: 50개 포인트 수동 반복 (pynput 은 tween 없음)
    path = test_path((100, 100), (800, 600), n_steps=50)
    print(f"[경로 이동] {len(path)}개 포인트, sleep(10ms) 간격")
    t0 = time.monotonic()
    for x, y in path:
        mouse.position = (x, y)
        time.sleep(0.01)  # 10ms 간격 수동 제어
    t1 = time.monotonic()
    print(f"  총 소요: {(t1-t0)*1000:.0f}ms (예상 ~510ms)")

    # move (상대 이동) 테스트
    print("\n[상대 이동] move(50, -30) 으로 현재 위치에서 상대 이동")
    mouse.move(50, -30)
    time.sleep(0.2)
    print(f"  이동 후: {mouse.position}")

    print("\n=== pynput 특성 ===")
    print("  - 좌표: int 만 실제 사용")
    print("  - 속도: 내장 tween 없음 — 호출자가 수동 루프로 제어")
    print("  - 주입: Windows SendInput (유저 레벨). PyAutoGUI 와 같은 계층")
    print("  - 강점: 리스너(on_move/on_click) + 컨트롤러 동시 지원")
    print("  - 현재 human_recorder.py 에서 이미 사용 중")
    print("  - 설치: pip install pynput (ez)")
    print("  - 단점: 스무스 커스텀 이동은 직접 보간 필요")


if __name__ == "__main__":
    main()
