"""user 별 click-to-click trace pool 매칭 (티켓 315 Sub-step D).

distance ± tol×distance 범위 내 trace 가 있으면 random pick.
없으면 가장 가까운 distance trace 강제 pick (fallback) — 의문 3 결정.

호출측이 fallback 빈도를 카운트할 수 있도록 was_fallback bool 함께 반환.
"""
from __future__ import annotations

import bisect
import json
import random
from pathlib import Path


class TracePool:
    """norm_path + distance 카탈로그. distance 기반 매칭."""

    def __init__(self, traces: list[tuple[list[tuple[float, float]], float]]):
        """traces: [(norm_path [(nx, ny), ...], distance px), ...]."""
        # distance 정렬 + 별도 list 로 보관 (bisect 용)
        sorted_traces = sorted(traces, key=lambda t: t[1])
        self._norms: list[list[tuple[float, float]]] = [t[0] for t in sorted_traces]
        self._dists: list[float] = [t[1] for t in sorted_traces]
        self.user_id: str | None = None  # from_user 가 채움

    def __len__(self) -> int:
        return len(self._dists)

    def get(
        self,
        distance: float,
        tol: float = 0.5,
        rng: random.Random | None = None,
    ) -> tuple[list[tuple[float, float]], bool]:
        """distance ± tol×distance 범위 내 random pick.

        없으면 가장 가까운 distance trace 강제 pick (fallback).
        반환: (norm_path [(nx, ny), ...], was_fallback bool)
        """
        if not self._dists:
            raise ValueError(f"TracePool 비어있음 (user={self.user_id})")
        r = rng or random
        lo = distance * (1.0 - tol)
        hi = distance * (1.0 + tol)

        # bisect 로 범위 인덱스 산출
        i_lo = bisect.bisect_left(self._dists, lo)
        i_hi = bisect.bisect_right(self._dists, hi)

        if i_hi > i_lo:
            idx = r.randrange(i_lo, i_hi)
            return self._norms[idx], False

        # fallback: 가장 가까운 distance
        # 인접 후보: i_lo (>=) 또는 i_lo - 1 (<)
        candidates: list[int] = []
        if i_lo < len(self._dists):
            candidates.append(i_lo)
        if i_lo > 0:
            candidates.append(i_lo - 1)
        best = min(candidates, key=lambda i: abs(self._dists[i] - distance))
        return self._norms[best], True

    @classmethod
    def from_user(cls, user_id: str, pool_dir: Path) -> "TracePool":
        """data/processed/balabit_trace_pool/{user_id}.json 로드.

        파일 형식: [[norm_path, distance], ...] where norm_path = [[nx, ny], ...]
        """
        path = pool_dir / f"{user_id}.json"
        if not path.exists():
            raise FileNotFoundError(f"trace pool 파일 없음: {path}")
        with open(path, "r", encoding="utf-8") as f:
            payload = json.load(f)
        traces: list[tuple[list[tuple[float, float]], float]] = [
            ([(float(p[0]), float(p[1])) for p in norm], float(dist))
            for norm, dist in payload
        ]
        pool = cls(traces)
        pool.user_id = user_id
        return pool
