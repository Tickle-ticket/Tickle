"""lv3_balabit_kde — Balabit 다중 사용자 KDE 휴먼라이크 매크로 (티켓 315).

서브패키지 모듈:
  extract_distributions.py — user 별 6 분포 raw values 추출
  build_kde_params.py      — 분포 → percentile inverse CDF (1001 포인트)
  precompute_traces.py     — click-to-click 공간 trace pool 사전계산
  kde_sampler.py           — KDE inverse CDF sampling (Sub-step D)
  trace_pool.py            — trace 매칭 + fallback (Sub-step D)
  trajectory.py            — 공간 trace + KDE timing 합성 (Sub-step D)
  lv3_balabit_kde_collector.py — trial 단위 random user pick + 매크로 실행 (Sub-step D)
"""
