"""KDE inverse CDF sampling (티켓 315 Sub-step D).

학습된 percentile inverse CDF (1001 포인트) 에서 random sampling.
random 0~1 → CDF index → linear interpolation.

stop_segments_per_session 분포는 학습되어 있으나 collector 가 sample 하지 않음
(분석 chat 의문 2 결정 — 학습만, collector 미사용).
"""
from __future__ import annotations

import json
import random
from pathlib import Path


class KDESampler:
    """user 별 6 분포 inverse CDF sampling."""

    def __init__(self, params: dict[str, list[float]]):
        """params: {분포명: 1001 inverse CDF 포인트}.

        포인트 = numpy.percentile(values, [0, 0.1, 0.2, ..., 100]) 결과.
        sample 시: u = random(0, 1), idx = u * (n - 1), linear interp.
        """
        self.params: dict[str, list[float]] = params
        self.user_id: str | None = None  # from_user 가 채움

    def sample(self, dist_name: str, rng: random.Random | None = None) -> float:
        """random 0~1 → inverse CDF linear interpolation.

        분포가 비어있으면 ValueError (호출측이 회피 책임 — collector 는 plan 의문 2 결정대로
        stop_segments_per_session 을 sample 하지 않음).
        """
        cdf = self.params.get(dist_name)
        if not cdf:
            raise ValueError(f"KDESampler: '{dist_name}' 분포 비어있음 (user={self.user_id})")
        r = (rng or random).random()
        n = len(cdf)
        # u ∈ [0, 1) → fractional index ∈ [0, n-1)
        f_idx = r * (n - 1)
        i0 = int(f_idx)
        i1 = min(i0 + 1, n - 1)
        frac = f_idx - i0
        return cdf[i0] * (1.0 - frac) + cdf[i1] * frac

    @classmethod
    def from_user(cls, user_id: str, params_dir: Path) -> "KDESampler":
        """data/processed/balabit_kde_params/{user_id}.json 로드."""
        path = params_dir / f"{user_id}.json"
        if not path.exists():
            raise FileNotFoundError(f"params 파일 없음: {path}")
        with open(path, "r", encoding="utf-8") as f:
            params = json.load(f)
        sampler = cls(params)
        sampler.user_id = user_id
        return sampler
