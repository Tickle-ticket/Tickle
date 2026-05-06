"""공간 trace + KDE timing 합성 (티켓 315 Sub-step D).

책임 분리:
  - 공간 (x, y) — TracePool 의 norm_path 카탈로그에서 distance 기반 pick → apply_path
  - timing (sleep_ms) — KDESampler 의 mouse_move_dt_ms 분포에서 step 별 독립 sample

trace 의 ts_ms 정보는 사용 X (Sub-step C 에서 normalize 시 미보존). KDE 분포가 timing 단일 출처.
"""
from __future__ import annotations

import math
import random

from macro.mouse_automation.collector.lv3_balabit_kde.kde_sampler import KDESampler
from macro.mouse_automation.collector.lv3_balabit_kde.precompute_traces import apply_path
from macro.mouse_automation.collector.lv3_balabit_kde.trace_pool import TracePool


def generate_trajectory(
    start: tuple[int, int],
    end: tuple[int, int],
    sampler: KDESampler,
    pool: TracePool,
    rng: random.Random,
    tol: float = 0.5,
) -> tuple[list[tuple[int, int, float]], bool]:
    """공간 trace + KDE timing 합성.

    1. distance 계산 (start → end Euclidean px)
    2. pool.get(distance, tol) → norm_path (공간 (nx, ny) 카탈로그)
    3. apply_path(norm_path, start, end) → [(x, y), ...] 점 시퀀스
    4. 각 step 의 sleep_ms = sampler.sample("mouse_move_dt_ms")  ← KDE 분포만으로 timing 결정

    반환: (trajectory [(x, y, sleep_ms), ...], was_fallback)
      collector 가 (x, y) 마다 sleep + moveTo 반복 + EventLogger 로그.
      was_fallback 은 collector 가 누적 카운트.
    """
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    distance = math.sqrt(dx * dx + dy * dy)

    norm_path, was_fallback = pool.get(distance, tol=tol, rng=rng)
    points = apply_path(norm_path, start, end)

    trajectory: list[tuple[int, int, float]] = []
    for x, y in points:
        sleep_ms = sampler.sample("mouse_move_dt_ms", rng=rng)
        # KDE 분포가 0~ 까지 — 음수 방어 (이론상 percentile 이라 0 미만 X 이지만 안전 floor)
        sleep_ms = max(0.0, float(sleep_ms))
        trajectory.append((x, y, sleep_ms))

    return trajectory, was_fallback
