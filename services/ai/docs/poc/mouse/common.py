"""PoC 공통: 테스트 경로, 카운트다운, 좌표 검증용 마우스 위치 읽기."""
import time
from typing import List, Tuple


def countdown(seconds: int = 3) -> None:
    """테스트 시작 전 카운트다운 — 사용자가 마우스에서 손 뗄 시간."""
    print(f"\n{seconds}초 뒤 마우스가 자동 이동합니다. 손 떼주세요.")
    for i in range(seconds, 0, -1):
        print(f"  {i}...")
        time.sleep(1)
    print("  START!\n")


def test_path(start: Tuple[int, int], end: Tuple[int, int], n_steps: int = 50) -> List[Tuple[float, float]]:
    """start → end 직선 경로를 n_steps 개 좌표로 분할. float 좌표 반환 (정밀도 테스트용)."""
    sx, sy = start
    ex, ey = end
    return [
        (sx + (ex - sx) * i / n_steps, sy + (ey - sy) * i / n_steps)
        for i in range(n_steps + 1)
    ]


def record_positions(read_fn, duration_s: float = 1.0, interval_s: float = 0.01) -> List[Tuple[float, Tuple[int, int]]]:
    """read_fn() → (x, y) 반환하는 함수. duration_s 동안 interval_s 간격 샘플링."""
    start = time.monotonic()
    samples = []
    while time.monotonic() - start < duration_s:
        t = time.monotonic() - start
        pos = read_fn()
        samples.append((t, pos))
        time.sleep(interval_s)
    return samples
