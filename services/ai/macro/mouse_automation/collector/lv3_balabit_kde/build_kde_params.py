"""user 별 KDE params (percentile inverse CDF) 학습 (티켓 315 Sub-step B).

Input : data/processed/balabit_kde_distributions/{user}_raw.json
Output: data/processed/balabit_kde_params/{user}.json

학습 방식 (lv_inf 참조, 자체 구현):
  - percentile 기반 inverse CDF
  - 1001 포인트 (0~100 percentile, 0.1 step)
  - trim_low=2, trim_high=99 (outlier 제거)
  - numpy.percentile + linear interp

검증 floor (분석 chat 결정):
  - min_clicks=20, min_paths=20 — 미달 user 는 warn 로그만 (drop X, detector pool 일치 유지)

실행 (cwd = services/ai/):
    python -m macro.mouse_automation.collector.lv3_balabit_kde.build_kde_params
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from macro.mouse_automation.collector.lv3_balabit_kde.extract_distributions import (
    DISTRIBUTION_NAMES,
)


N_POINTS_DEFAULT = 1001
TRIM_LOW_DEFAULT = 2
TRIM_HIGH_DEFAULT = 99
MIN_CLICKS_FLOOR = 20
MIN_PATHS_FLOOR = 20


def build_inverse_cdf(
    values: list[float],
    n_points: int = N_POINTS_DEFAULT,
    trim_low: int = TRIM_LOW_DEFAULT,
    trim_high: int = TRIM_HIGH_DEFAULT,
) -> list[float]:
    """percentile 기반 inverse CDF.

    1001 포인트 — 0~100 percentile (0.1 step) → numpy.percentile 로 1001개 분위수 산출.
    값이 비어있으면 빈 리스트 반환 (호출측이 fallback 처리).
    """
    if not values:
        return []
    arr = np.asarray(values, dtype=float)
    # outlier trim
    lo = float(np.percentile(arr, trim_low))
    hi = float(np.percentile(arr, trim_high))
    arr = arr[(arr >= lo) & (arr <= hi)]
    if arr.size == 0:
        return []
    qs = np.linspace(0.0, 100.0, n_points)
    cdf = np.percentile(arr, qs).tolist()
    return cdf


def build_user_params(distributions: dict[str, list[float]]) -> dict[str, list[float]]:
    """{분포명: raw values} → {분포명: 1001 inverse CDF 포인트}."""
    return {
        name: build_inverse_cdf(distributions.get(name, []))
        for name in DISTRIBUTION_NAMES
    }


def verify_user_params(user: str, params: dict[str, list[float]]) -> list[str]:
    """params 검증 — 1001 포인트 + monotonic non-decreasing.
    반환: 경고 리스트 (빈 리스트면 통과)."""
    warns: list[str] = []
    for name, cdf in params.items():
        if not cdf:
            warns.append(f"{name}: empty (raw values 부족)")
            continue
        if len(cdf) != N_POINTS_DEFAULT:
            warns.append(f"{name}: 포인트 {len(cdf)} (예상 {N_POINTS_DEFAULT})")
        # monotonic non-decreasing
        for i in range(1, len(cdf)):
            if cdf[i] < cdf[i - 1]:
                warns.append(f"{name}: non-monotonic at idx {i} ({cdf[i-1]:.4f} > {cdf[i]:.4f})")
                break
    return warns


def floor_check(stats_per_user: dict) -> list[str]:
    """min_clicks_floor / min_paths_floor 체크.
    반환: 경고 리스트 (미달 user 별)."""
    warns: list[str] = []
    if stats_per_user.get("clicks_total", 0) < MIN_CLICKS_FLOOR:
        warns.append(
            f"clicks {stats_per_user['clicks_total']} < floor {MIN_CLICKS_FLOOR}"
        )
    if stats_per_user.get("paths_total", 0) < MIN_PATHS_FLOOR:
        warns.append(
            f"paths {stats_per_user['paths_total']} < floor {MIN_PATHS_FLOOR}"
        )
    return warns


def _load_user_raw(json_path: Path) -> dict[str, list[float]]:
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="user 별 KDE params 학습 (티켓 315 Sub-step B)"
    )
    parser.add_argument("--input-dir", type=Path, default=None,
                        help="기본 services/ai/data/processed/balabit_kde_distributions")
    parser.add_argument("--output-dir", type=Path, default=None,
                        help="기본 services/ai/data/processed/balabit_kde_params")
    parser.add_argument("--user-filter", type=str, default=None,
                        help="특정 user 만 처리 (예: user7)")
    args = parser.parse_args()

    ai_root = Path(__file__).resolve().parents[4]
    input_dir = args.input_dir or (ai_root / "data" / "processed" / "balabit_kde_distributions")
    output_dir = args.output_dir or (ai_root / "data" / "processed" / "balabit_kde_params")

    if not input_dir.exists():
        print(f"[error] input dir 없음: {input_dir}. extract_distributions 먼저 실행.")
        return 1

    raw_files = sorted(input_dir.glob("*_raw.json"))
    if args.user_filter:
        raw_files = [p for p in raw_files if p.stem.replace("_raw", "") == args.user_filter]
    if not raw_files:
        print(f"[error] *_raw.json 없음: {input_dir}")
        return 1

    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Input dir:  {input_dir}")
    print(f"Output dir: {output_dir}")
    print(f"Users:      {len(raw_files)}")
    print(f"Floor:      min_clicks={MIN_CLICKS_FLOOR}, min_paths={MIN_PATHS_FLOOR}")
    print()

    floor_violations = 0
    monotonic_violations = 0
    for raw_path in raw_files:
        user = raw_path.stem.replace("_raw", "")
        distributions = _load_user_raw(raw_path)
        # raw 길이 = 분포별 항목 수
        n_per_dist = {name: len(distributions.get(name, [])) for name in DISTRIBUTION_NAMES}
        # paths_total = moves_per_click 항목 수
        paths_total = n_per_dist["moves_per_click"]
        # clicks_total = inter_click_interval + 1 (paths != clicks 직접 추정 X)
        clicks_total = n_per_dist["inter_click_interval_ms"] + 1 if n_per_dist["inter_click_interval_ms"] > 0 else 0

        params = build_user_params(distributions)

        out_path = output_dir / f"{user}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(params, f, ensure_ascii=False)

        # floor check
        floor_warns = floor_check({
            "clicks_total": clicks_total,
            "paths_total": paths_total,
        })
        if floor_warns:
            floor_violations += 1
            for w in floor_warns:
                print(f"  [warn] {user}: floor 미달 — {w}")

        # params 검증
        verify_warns = verify_user_params(user, params)
        if verify_warns:
            monotonic_violations += 1
            for w in verify_warns:
                print(f"  [warn] {user}: {w}")

        print(
            f"[{user}] clicks={clicks_total} paths={paths_total} "
            f"params: {{{', '.join(f'{n}={len(params[n])}' for n in DISTRIBUTION_NAMES)}}}"
        )

    print()
    print("=== Sub-step B - build 결과 ===")
    print(f"  총 user: {len(raw_files)}")
    print(f"  floor 미달 user: {floor_violations}")
    print(f"  검증 경고 (monotonic / 포인트 수) user: {monotonic_violations}")
    print(f"  출력 폴더: {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
