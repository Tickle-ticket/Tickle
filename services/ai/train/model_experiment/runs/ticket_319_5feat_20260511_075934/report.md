# Ticket 319 — 5-feature baseline 재학습

## 비교 표

| condition          | features | overall | lv3    |
| ------------------ | -------- | ------- | ------ |
| 065547 baseline    | 2        | 1.0000  | 0.9600 |
| 074742 abs cleaned | 6        | 1.0000  | 0.9600 |
| 319 5feat (본 실험) | 5        | 1.0000  | 0.9600 |

## features (5)

- time_to_first_click_ms
- mouse_max_speed_px_per_ms
- mouse_jerk_mean
- mouse_path_straightness_score
- mousemove_event_rate

## feature importance (XGBoost gain default)

| feature | importance |
| --- | --- |
| time_to_first_click_ms | 1.000000 |
| mouse_max_speed_px_per_ms | 0.000000 |
| mouse_jerk_mean | 0.000000 |
| mouse_path_straightness_score | 0.000000 |
| mousemove_event_rate | 0.000000 |

## 파일

- metrics.json
- feature_importance.json
- model.joblib
- report.md (this)
