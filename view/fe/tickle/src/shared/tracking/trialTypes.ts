/**
 * Trial JSON 행동 데이터 수집 타입 정의
 * AI팀의 trial_record_example.json 스펙에 맞춤
 */

// ─── Stage ───────────────────────────────────────────────────
export type TrialStage = 'captcha' | 'booking' | 'ticket_type' | 'payment';

// ─── Label ───────────────────────────────────────────────────
export type TrialLabel = 'human' | 'macro' | 'none';

// ─── Summary ─────────────────────────────────────────────────
export interface TrialSummary {
  stage: TrialStage;
  durationMs: number;
  clickCount: number;
  eventCount: number;
  windowCount: number;
  selectedSeats: string[];
  label: TrialLabel;
}

// ─── Metrics (34 features) ──────────────────────────────────
export interface TrialMetrics {
  // Click/Timing (15)
  time_to_first_click_ms: number | null;
  time_from_element_visible_to_click_ms: number | null;
  time_from_element_clickable_to_click_ms: number | null;
  inter_click_interval_ms: number | null;
  click_sequence_consistency_score: number | null;
  click_position_repeat_rate: number | null;
  click_offset_from_element_center_px: number | null;
  click_offset_variance_px: number | null;
  double_click_rate: number | null;
  misclick_rate: number | null;
  reclick_rate: number | null;
  pre_click_mousemove_count: number | null;
  pre_click_hover_time_ms: number | null;
  pre_click_scroll_flag: number;
  immediate_post_render_click_rate: number | null;

  // Mouse (19)
  mouse_total_travel_distance_px: number | null;
  mouse_avg_speed_px_per_ms: number | null;
  mouse_max_speed_px_per_ms: number | null;
  mouse_speed_change_mean: number | null;
  mouse_acceleration_mean: number | null;
  mouse_jerk_mean: number | null;
  mouse_path_straightness_score: number | null;
  mouse_path_curvature_mean: number | null;
  mouse_direction_change_count: number | null;
  mouse_overshoot_flag: number;
  mouse_hover_dwell_time_ms: number | null;
  mouse_stop_segment_count: number | null;
  mousemove_event_rate: number | null;
  pre_click_path_300ms_total_distance_px: number;
  pre_click_path_300ms_straightness: number;
  pre_click_path_500ms_total_distance_px: number;
  pre_click_path_500ms_straightness: number;
  inter_element_move_interval_std_ms: number | null;
  edge_or_fixed_point_visit_rate: number | null;

}

// ─── EventRow Variants ──────────────────────────────────────

export interface BaseEventRow {
  trial_id: number;
  event_index: number;
  relative_ms: number;
  stage: TrialStage;
  event_type: string;
  track_id: string | null;
}

export interface MousemoveEventRow extends BaseEventRow {
  event_type: 'mousemove';
  x: number;
  y: number;
}

export interface ClickEventRow extends BaseEventRow {
  event_type: 'click';
  x: number;
  y: number;
  time_from_visible_ms: number | null;
  time_from_clickable_ms: number | null;
  inter_click_interval_ms: number | null;
  pre_click_mousemove_count: number;
  pre_click_hover_time_ms: number | null;
  pre_click_scroll_flag: number;
  offset_distance_px: number | null;
  is_double_click: number;
  is_reclick: number;
  is_misclick: number;
}

export interface ScrollEventRow extends BaseEventRow {
  event_type: 'scroll';
  scroll_y: number;
}

export interface FocusEventRow extends BaseEventRow {
  event_type: 'focus';
}

export interface KeydownEventRow extends BaseEventRow {
  event_type: 'keydown';
  key: string;
  code: string;
  is_repeat: number;
}

export interface KeyupEventRow extends BaseEventRow {
  event_type: 'keyup';
  key: string;
  code: string;
  hold_ms: number | null;
}

export interface PasteEventRow extends BaseEventRow {
  event_type: 'paste';
}

export type EventRow =
  | MousemoveEventRow
  | ClickEventRow
  | ScrollEventRow
  | FocusEventRow
  | KeydownEventRow
  | KeyupEventRow
  | PasteEventRow;

// ─── WindowRow ──────────────────────────────────────────────
export interface WindowRow {
  trial_id: number;
  snapshot_index: number;
  relative_ms: number;
  stage: TrialStage;
  click_count: number;
  move_count: number;
  scroll_count: number;
}

// ─── Trial JSON (최상위) ────────────────────────────────────
export interface TrialJSON {
  trialId: number;
  userId: number | null;
  sessionId: string;
  label: TrialLabel;
  summary: TrialSummary;
  metrics: TrialMetrics;
  eventRows: EventRow[];
  windowRows: WindowRow[];
}
