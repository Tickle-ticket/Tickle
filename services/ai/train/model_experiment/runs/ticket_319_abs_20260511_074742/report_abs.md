# Ticket 319 — abs AUC 재산출 + correlation pruning

## 방식

- abs_auc = |raw_auc - 0.5| + 0.5
- abs cutoff: 0.65
- correlation pruning cutoff: |r| >= 0.85
- XGBoost: n_estimators=400, max_depth=3, learning_rate=0.03, random_state=42

## abs lv3 AUC (16 feature)

| feature | baseline_raw | baseline_abs | +today_raw | +today_abs |
| --- | --- | --- | --- | --- |
| time_to_first_click_ms | 0.9200 | 0.9200 | 0.7800 | 0.7800 |
| inter_click_interval_ms | 0.2310 | 0.7690 | 0.2310 | 0.7690 |
| pre_click_mousemove_count | 0.4200 | 0.5800 | 1.0000 | 1.0000 |
| mouse_total_travel_distance_px | 0.5977 | 0.5977 | 0.5977 | 0.5977 |
| mouse_avg_speed_px_per_ms | 0.3898 | 0.6102 | 0.3898 | 0.6102 |
| mouse_max_speed_px_per_ms | 0.2845 | 0.7155 | 0.2845 | 0.7155 |
| mouse_speed_change_mean | 0.3675 | 0.6325 | 0.6325 | 0.6325 |
| mouse_acceleration_mean | 0.2087 | 0.7913 | 0.2087 | 0.7913 |
| mouse_jerk_mean | 0.1746 | 0.8254 | 0.1746 | 0.8254 |
| mouse_path_straightness_score | 0.6878 | 0.6878 | 0.3122 | 0.6878 |
| mouse_path_curvature_mean | 0.3754 | 0.6246 | 0.3754 | 0.6246 |
| mouse_direction_change_count | 0.4153 | 0.5847 | 0.4153 | 0.5847 |
| mouse_overshoot_flag | 0.5000 | 0.5000 | 0.5000 | 0.5000 |
| mouse_hover_dwell_time_ms | 0.5400 | 0.5400 | 0.5600 | 0.5600 |
| mouse_stop_segment_count | 0.0000 | 1.0000 | 0.0000 | 1.0000 |
| mousemove_event_rate | 0.0600 | 0.9400 | 0.9800 | 0.9800 |

## Cutoff 통과 pre-pruning

- baseline (n=8): ['time_to_first_click_ms', 'inter_click_interval_ms', 'mouse_max_speed_px_per_ms', 'mouse_acceleration_mean', 'mouse_jerk_mean', 'mouse_path_straightness_score', 'mouse_stop_segment_count', 'mousemove_event_rate']
- +today (n=9): ['time_to_first_click_ms', 'inter_click_interval_ms', 'pre_click_mousemove_count', 'mouse_max_speed_px_per_ms', 'mouse_acceleration_mean', 'mouse_jerk_mean', 'mouse_path_straightness_score', 'mouse_stop_segment_count', 'mousemove_event_rate']

## Cleaned pool (correlation pruning 후)

- baseline (n=6): ['time_to_first_click_ms', 'mouse_max_speed_px_per_ms', 'mouse_jerk_mean', 'mouse_path_straightness_score', 'mouse_stop_segment_count', 'mousemove_event_rate']
- +today (n=5): ['inter_click_interval_ms', 'pre_click_mousemove_count', 'mouse_max_speed_px_per_ms', 'mouse_jerk_mean', 'mouse_stop_segment_count']

## XGBoost 결과

| condition | feature_count | overall_auc | lv3_auc |
| --- | --- | --- | --- |
| baseline | 6 | 1.0000 | 0.9600 |
| +today | 5 | 0.9955 | 0.7600 |

## 065547 baseline (2 feature) 비교

| metric | 065547 baseline | abs baseline | delta |
| --- | --- | --- | --- |
| feature_count | 2 | 6 | +4 |
| overall_auc | 1.0000 | 1.0000 | +0.0000 |
| lv3_auc | 0.9600 | 0.9600 | +0.0000 |

- 065547 features: ['time_to_first_click_ms', 'mouse_path_straightness_score']
- abs cleaned baseline features: ['time_to_first_click_ms', 'mouse_max_speed_px_per_ms', 'mouse_jerk_mean', 'mouse_path_straightness_score', 'mouse_stop_segment_count', 'mousemove_event_rate']

## mouse_stop_segment_count

- stop_segment_diagnosis.md 참조.

## 파일

- abs_univariate.json
- stop_segment_diagnosis.md
- correlation_pruning_log.md
- multivariate_abs.json
- report_abs.md (this)
