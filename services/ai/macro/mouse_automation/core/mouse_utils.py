"""마우스 유틸리티 — 베지어 곡선 / 좌표 노이즈 / 랜덤 딜레이 / Fitts 법칙 기반 타이밍.

Lv2 매크로(`pyautogui_lv2.py`) 가 사람처럼 보이는 움직임을 만들기 위해 사용.
4개 함수 조합으로 다음을 구현:

  사람같은 마우스 이동 =
      (시작→끝) 베지어 곡선 경로                ← bezier_curve()
    + 각 점에 가우시안 노이즈                    ← add_noise()
    + 전체 이동 시간은 Fitts 법칙으로 결정       ← human_like_duration()
    + 액션 간은 로그정규 분포 랜덤 delay         ← random_delay()

관련 스토리:
  - #123 베지어 곡선 궤적 생성기 → bezier_curve()
  - #125 human-like 속도·jitter 프로파일 → add_noise + human_like_duration + random_delay
"""
import random
import time
import numpy as np


def bezier_curve(
    start: tuple[int, int],
    end: tuple[int, int],
    num_points: int = 20,
    num_control: int = 2,
    spread: float = 80.0,
) -> list[tuple[int, int]]:
    """
    시작점에서 끝점까지 베지어 곡선 경로 생성.
    제어점을 무작위로 배치하여 자연스러운 곡선 궤적 생성.
    """
    # 시작/끝 + 랜덤 제어점
    points = [np.array(start, dtype=float)]
    for i in range(num_control):
        t = (i + 1) / (num_control + 1)
        mid = np.array(start) * (1 - t) + np.array(end) * t
        offset = np.array([
            random.gauss(0, spread),
            random.gauss(0, spread),
        ])
        points.append(mid + offset)
    points.append(np.array(end, dtype=float))

    # De Casteljau 알고리즘으로 베지어 곡선 점 계산
    path = []
    for t_val in np.linspace(0, 1, num_points):
        pts = [p.copy() for p in points]
        while len(pts) > 1:
            pts = [
                pts[i] * (1 - t_val) + pts[i + 1] * t_val
                for i in range(len(pts) - 1)
            ]
        path.append((int(round(pts[0][0])), int(round(pts[0][1]))))

    return path


def add_noise(x: int, y: int, sigma: float = 4.0) -> tuple[int, int]:
    """좌표에 가우시안 노이즈 추가."""
    nx = int(round(x + random.gauss(0, sigma)))
    ny = int(round(y + random.gauss(0, sigma)))
    return (max(0, nx), max(0, ny))


def random_delay(min_s: float = 0.1, max_s: float = 0.8):
    """랜덤 딜레이. 로그정규분포로 자연스러운 대기 시간 생성."""
    # 대부분 짧은 대기, 가끔 긴 대기
    mean = (min_s + max_s) / 2
    delay = max(min_s, min(max_s, random.lognormvariate(
        np.log(mean), 0.4
    )))
    time.sleep(delay)


def human_like_duration(distance_px: float, base_speed: float = 0.5) -> float:
    """
    Fitts 법칙 근사: 거리에 따른 이동 시간 (초).
    멀수록 오래 걸리지만 선형은 아님.
    """
    if distance_px < 1:
        return 0.01
    # a + b * log2(1 + D)
    duration = 0.05 + base_speed * np.log2(1 + distance_px) / 10
    # 약간의 변동성 추가
    duration *= random.uniform(0.8, 1.2)
    return max(0.01, duration)
