"""Interception PoC — 커널 모드 드라이버 기반 마우스 주입.

실행 전제:
1) Interception 드라이버 설치 (Windows 전용): https://github.com/oblitum/Interception
   - install-interception.exe /install 실행 후 재부팅 필요
2) pip install interception-python  (언오피셜 바인딩 중 선택)

실행: python docs/poc/mouse/poc_interception.py

주의: Interception 은 **커널 수준**에서 마우스 이벤트를 주입하므로,
브라우저 mousemove 이벤트와 완전히 구분 불가능한 수준의 입력을 생성할 수 있음.
단, 설치/환경 구성 난이도가 높고, Windows 전용.

**현재 코드는 구조 예시일 뿐. 실제 실행을 위해서는 라이브러리 설치 + 드라이버 설치 필요.**
"""
import time

try:
    import interception  # type: ignore
except ImportError:
    interception = None

from .common import countdown, test_path


def main() -> None:
    print("=== Interception PoC ===")

    if interception is None:
        print("  interception 라이브러리 미설치. 구조 예시 코드만 표시.")
        print()
        print("  예상 API (interception-python 기준):")
        print("      ctx = interception.auto_capture_devices(keyboard=True, mouse=True)")
        print("      interception.move_to(x, y)")
        print("      interception.left_click()")
        print()
        print("=== Interception 특성 (문서 기반) ===")
        print("  - 좌표: int. 그러나 move_relative 로 고정밀도 상대 이동 가능")
        print("  - 속도: 호출자 수동 제어 + 타이밍 ms 단위")
        print("  - 주입: **커널 드라이버 수준** — 하드웨어 마우스와 구분 불가")
        print("  - 탐지 회피: 최고 (게임/안티치트 우회 목적으로 주로 개발됨)")
        print("  - 단점: 설치 복잡(드라이버 + 재부팅), Windows 전용, 개발 부담")
        print("  - 우리 프로젝트 맥락: 매크로 실제 사례를 가장 잘 모사 가능")
        return

    # 실제 설치된 경우의 PoC
    print("interception 설치됨. 장치 캡처 시작.")
    try:
        interception.auto_capture_devices()
    except Exception as e:
        print(f"  장치 캡처 실패: {e}")
        return

    countdown(3)

    path = test_path((100, 100), (800, 600), n_steps=50)
    print(f"[경로 이동] {len(path)}개 포인트")
    t0 = time.monotonic()
    for x, y in path:
        interception.move_to(int(x), int(y))
        time.sleep(0.01)
    t1 = time.monotonic()
    print(f"  총 소요: {(t1-t0)*1000:.0f}ms")


if __name__ == "__main__":
    main()
