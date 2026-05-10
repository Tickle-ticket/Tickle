# Correlation pruning log

cutoff: |r| >= 0.85

## Pre-pruning pool (abs AUC >= 0.65)

- baseline (n=8): ['time_to_first_click_ms', 'inter_click_interval_ms', 'mouse_max_speed_px_per_ms', 'mouse_acceleration_mean', 'mouse_jerk_mean', 'mouse_path_straightness_score', 'mouse_stop_segment_count', 'mousemove_event_rate']
- +today (n=9): ['time_to_first_click_ms', 'inter_click_interval_ms', 'pre_click_mousemove_count', 'mouse_max_speed_px_per_ms', 'mouse_acceleration_mean', 'mouse_jerk_mean', 'mouse_path_straightness_score', 'mouse_stop_segment_count', 'mousemove_event_rate']

## High-correlation pairs (|r| >= 0.85) on union pool

| feat1 | feat2 | |r| (baseline_train) | |r| (today_train) |
| --- | --- | --- | --- |
| inter_click_interval_ms | time_to_first_click_ms | 0.9090 | 0.2127 |
| mouse_acceleration_mean | mouse_jerk_mean | 0.8661 | 0.8663 |
| mouse_path_straightness_score | mouse_stop_segment_count | 0.3899 | 0.8975 |
| mousemove_event_rate | pre_click_mousemove_count | 0.2894 | 0.9339 |
| pre_click_mousemove_count | time_to_first_click_ms | 0.8143 | 0.8670 |

## Pruning decisions — baseline

| dropped | kept | |r| | kept abs AUC | dropped abs AUC |
| --- | --- | --- | --- | --- |
| inter_click_interval_ms | time_to_first_click_ms | 0.9090 | 0.9200 | 0.7690 |
| mouse_acceleration_mean | mouse_jerk_mean | 0.8661 | 0.8254 | 0.7913 |

## Pruning decisions — +today

| dropped | kept | |r| | kept abs AUC | dropped abs AUC |
| --- | --- | --- | --- | --- |
| mousemove_event_rate | pre_click_mousemove_count | 0.9339 | 1.0000 | 0.9800 |
| mouse_path_straightness_score | mouse_stop_segment_count | 0.8975 | 1.0000 | 0.6878 |
| time_to_first_click_ms | pre_click_mousemove_count | 0.8670 | 1.0000 | 0.7800 |
| mouse_acceleration_mean | mouse_jerk_mean | 0.8663 | 0.8254 | 0.7913 |

## Cleaned pool

- baseline (n=6): ['time_to_first_click_ms', 'mouse_max_speed_px_per_ms', 'mouse_jerk_mean', 'mouse_path_straightness_score', 'mouse_stop_segment_count', 'mousemove_event_rate']
- +today (n=5): ['inter_click_interval_ms', 'pre_click_mousemove_count', 'mouse_max_speed_px_per_ms', 'mouse_jerk_mean', 'mouse_stop_segment_count']
