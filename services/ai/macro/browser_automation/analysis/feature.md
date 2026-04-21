# 수집 Feature 매핑 표

브라우저 자동화 실험에서 수집하는 feature를 빠르게 확인하기 위한 간단 문서입니다.

기준:
- `수집 기준`은 현재 `simulator/src/tracking/core.js` 기준입니다.
- 일부 값은 raw event 자체가 아니라, 클릭/이동 로그로부터 계산된 파생 feature입니다.
- 분석 노트북에서는 아래 한글 이름을 짧은 라벨로 사용할 수 있습니다.

## 클릭/타이밍 계열 (15)
| feature | 한글명 | 수집 기준 | 메모 |
| --- | --- | --- | --- |
| `time_to_first_click_ms` | 첫 클릭 시간 | 세션 시작 후 첫 클릭까지 시간 | 시작 반응 속도 |
| `time_from_element_visible_to_click_ms` | 노출 후 클릭 | 요소 표시 후 클릭까지 평균 시간 | 요소 인지 반응 |
| `time_from_element_clickable_to_click_ms` | 활성 후 클릭 | 클릭 가능 상태 후 클릭까지 평균 시간 | 즉시 클릭 여부 확인 |
| `inter_click_interval_ms` | 클릭 간격 | 클릭 간 평균 시간 간격 | 반복 패턴 확인 |
| `click_sequence_consistency_score` | 순서 일관성 | 단계별 클릭 순서 일관성 점수 | 매크로는 높아지기 쉬움 |
| `click_position_repeat_rate` | 좌표 반복률 | 비슷한 좌표 재클릭 비율 | 동일 포인트 반복 |
| `click_offset_from_element_center_px` | 중심 오차 | 요소 중심과 클릭 좌표 평균 거리 | 정밀 클릭 여부 |
| `click_offset_variance_px` | 오차 분산 | 중심 오차의 분산 | 사람은 흔들림이 큼 |
| `double_click_rate` | 더블클릭 비율 | 짧은 시간 내 연속 클릭 비율 | 불필요한 연타 탐지 |
| `misclick_rate` | 오클릭 비율 | 현재 단계와 맞지 않는 클릭 비율 | 잘못 누른 비율 |
| `reclick_rate` | 재클릭 비율 | 같은 요소를 짧게 다시 누른 비율 | 망설임/중복 입력 |
| `pre_click_mousemove_count` | 클릭 전 이동 수 | 클릭 직전 mousemove 개수 평균 | 클릭 전 탐색 정도 |
| `pre_click_hover_time_ms` | 클릭 전 hover | 클릭 직전 hover 머문 평균 시간 | 사람은 대체로 더 김 |
| `pre_click_scroll_flag` | 클릭 전 스크롤 | 클릭 직전에 스크롤이 있었는지 | 0 또는 1 |
| `immediate_post_render_click_rate` | 즉시 클릭 비율 | 렌더 직후 매우 빠른 클릭 비율 | 매크로 의심 신호 |

## 마우스 이동 계열 (17)
| feature | 한글명 | 수집 기준 | 메모 |
| --- | --- | --- | --- |
| `mouse_total_travel_distance_px` | 총 이동 거리 | 세션 내 총 이동 거리 | 전체 탐색량 |
| `mouse_avg_speed_px_per_ms` | 평균 속도 | 총 이동 거리 / 총 시간 | 이동 전반 속도 |
| `mouse_max_speed_px_per_ms` | 최대 속도 | 구간별 최대 속도 | 급격한 이동 확인 |
| `mouse_speed_change_mean` | 속도 변화 | 구간 속도 차이 평균 | 움직임 자연스러움 |
| `mouse_acceleration_mean` | 가속도 변화 | 속도 변화량 / 시간 평균 | 속도 변화 패턴 |
| `mouse_jerk_mean` | 저크 평균 | 가속도 변화의 변화량 평균 | 급격한 조작 확인 |
| `mouse_path_straightness_score` | 경로 직선성 | 직선 거리 / 실제 이동 거리 | 1에 가까울수록 직선 |
| `mouse_path_curvature_mean` | 경로 곡률 | 방향 변화 대비 거리 평균 | 굴곡진 움직임 |
| `mouse_direction_change_count` | 방향 전환 수 | 큰 각도 변화 횟수 | 사람은 상대적으로 많음 |
| `mouse_overshoot_flag` | 오버슈트 여부 | 목표 지나침 후 복귀 패턴 | 0 또는 1 |
| `mouse_hover_dwell_time_ms` | 평균 dwell | 요소 위 평균 체류 시간 | 읽고 판단하는 시간 |
| `mouse_stop_segment_count` | 정지 구간 수 | 잠시 멈춘 이동 구간 수 | 탐색 중 멈춤 |
| `mousemove_event_rate` | mousemove 빈도 | 초당 mousemove 이벤트 수 | 사람 데이터에서 높음 |
| `pre_click_mouse_path_pattern_300ms` | 300ms 경로 패턴 | 클릭 직전 300ms 경로 요약 | 문자열 요약값 |
| `pre_click_mouse_path_pattern_500ms` | 500ms 경로 패턴 | 클릭 직전 500ms 경로 요약 | 문자열 요약값 |
| `inter_element_move_interval_std_ms` | 이동 간격 표준편차 | 요소 간 이동 시간의 표준편차 | 리듬 일정성 |
| `edge_or_fixed_point_visit_rate` | 고정점 방문률 | 화면 모서리/고정점 방문 비율 | 비정상 패턴 탐색 |

## 키보드 입력 계열 (10)
| feature | 한글명 | 수집 기준 | 메모 |
| --- | --- | --- | --- |
| `time_to_first_keydown_ms` | 첫 키 입력 시간 | captcha input 포커스 후 첫 keydown까지 시간 | 입력 시작 반응 |
| `inter_key_interval_ms_mean` | 키 간격 평균 | keydown 사이 평균 시간 | 타이핑 리듬 |
| `inter_key_interval_ms_std` | 키 간격 표준편차 | keydown 사이 시간 편차 | 사람은 보통 더 불규칙 |
| `keydown_to_keyup_ms_mean` | 키 누름 시간 | keydown 후 keyup까지 평균 시간 | dwell 성격 |
| `typing_total_duration_ms` | 총 입력 시간 | 첫 keydown부터 마지막 keydown까지 시간 | captcha 전체 입력 길이 |
| `typing_speed_cps` | 초당 입력 수 | 입력 문자 수 / 입력 시간 | 타이핑 속도 |
| `backspace_rate` | 백스페이스 비율 | 전체 keydown 중 Backspace 비율 | 수정 패턴 |
| `correction_count` | 수정 횟수 | Backspace keydown 횟수 | 오타 보정 |
| `paste_flag` | 붙여넣기 여부 | paste 이벤트 발생 여부 | 0 또는 1 |
| `focus_to_submit_ms` | 포커스 후 확인 | 입력창 포커스 후 captcha 확인 클릭까지 시간 | 입력+판단 시간 |

## 같이 보면 좋은 raw 데이터
| 항목 | 설명 |
| --- | --- |
| `eventRows` | `mousemove`, `click`, `scroll` 등 원시 이벤트 로그 |
| `eventRows.keydown/keyup/focus/paste` | captcha 입력 시점의 키보드 원시 이벤트 로그 |
| `windowRows` | 일정 간격으로 누적한 feature snapshot |
| `summary` | trial 단위 요약 정보 |
| `metrics` | trial 종료 시점 계산된 최종 feature |

## 추천 사용 순서
1. `trial_analysis.ipynb`에서 전체 분포와 상관관계를 먼저 확인합니다.
2. 차이가 큰 feature를 이 문서에서 다시 해석합니다.
3. 필요하면 `eventRows`로 돌아가 새로운 feature를 재정의합니다.
