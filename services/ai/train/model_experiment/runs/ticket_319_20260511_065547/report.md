# Ticket 319 + 320 재평가

## 데이터 구성

| source_group | count |
| --- | --- |
| balabit | 500 |
| lv2_human | 51 |
| lv2_macro | 101 |
| lv3_balabit_kde | 50 |
| lv4_aggressive | 101 |

- today_macro: 251
- lv4_aggressive 101개: 보겸 선택 A에 따라 학습 제외
- lv3_balabit_kde 50개: 학습 제외, eval-only 고정

## Train/Test Split

| condition | total_n | train_n | test_n | train_human | train_macro | test_human | test_macro |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 652 | 521 | 131 | 440 | 81 | 111 | 20 |
| +today | 903 | 722 | 181 | 441 | 281 | 110 | 71 |

## Univariate 비교

| feature | baseline_lv3_auc | +today_lv3_auc | delta_lv3_auc | baseline_overall_auc | +today_overall_auc |
| --- | --- | --- | --- | --- | --- |
| time_to_first_click_ms | 0.92 | 0.78 | -0.14 | 0.8180180180180181 | 0.5774647887323943 |
| inter_click_interval_ms | 0.23104 | 0.23104 | 0.0 | 0.9477477477477477 | 0.8508962868117798 |
| pre_click_mousemove_count | 0.42 | 1.0 | 0.5800000000000001 | 0.536036036036036 | 0.463764404609475 |
| mouse_total_travel_distance_px | 0.59772 | 0.59772 | 0.0 | 0.7743243243243244 | 0.8299615877080666 |
| mouse_avg_speed_px_per_ms | 0.38976 | 0.38976 | 0.0 | 0.8603603603603603 | 0.8856594110115237 |
| mouse_max_speed_px_per_ms | 0.28448 | 0.28448 | 0.0 | 0.9612612612612613 | 0.7513444302176697 |
| mouse_speed_change_mean | 0.36746 | 0.63254 | 0.26508 | 0.9234234234234233 | 0.594878361075544 |
| mouse_acceleration_mean | 0.20872000000000002 | 0.20872000000000002 | 0.0 | 0.8326576576576576 | 0.5798335467349551 |
| mouse_jerk_mean | 0.17464000000000002 | 0.17464000000000002 | 0.0 | 0.5047297297297297 | 0.7193982074263765 |
| mouse_path_straightness_score | 0.68784 | 0.31216 | -0.37568 | 0.34459459459459457 | 0.8275288092189501 |
| mouse_path_curvature_mean | 0.37536 | 0.37536 | 0.0 | 0.8513513513513514 | 0.876056338028169 |
| mouse_direction_change_count | 0.4153 | 0.4153 | 0.0 | 0.9272522522522523 | 0.9745198463508323 |
| mouse_overshoot_flag | 0.5 | 0.5 | 0.0 | 0.5 | 0.5 |
| mouse_hover_dwell_time_ms | 0.54 | 0.56 | 0.020000000000000018 | 0.4513513513513514 | 0.6087067861715749 |
| mouse_stop_segment_count | 0.0 | 0.0 | 0.0 | 0.6745495495495497 | 0.4143405889884763 |
| mousemove_event_rate | 0.06 | 0.98 | 0.9199999999999999 | 0.3833333333333333 | 0.43021766965428937 |

## Cutoff 통과 feature pool (lv3 AUC >= 0.65)

- baseline: ['time_to_first_click_ms', 'mouse_path_straightness_score']
- +today: ['time_to_first_click_ms', 'pre_click_mousemove_count', 'mousemove_event_rate']

## Multivariate XGBoost 결과

| condition | feature_count | overall_auc | lv3_auc | features |
| --- | --- | --- | --- | --- |
| baseline | 2 | 1.0 | 0.96 | ['time_to_first_click_ms', 'mouse_path_straightness_score'] |
| +today | 3 | 1.0 | 0.96 | ['time_to_first_click_ms', 'pre_click_mousemove_count', 'mousemove_event_rate'] |