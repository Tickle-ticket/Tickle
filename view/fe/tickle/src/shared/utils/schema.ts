import { Schema } from 'effect';

// ─── Enums & Literals ───────────────────────────────────────
export const TrialStageSchema = Schema.Literal('captcha', 'booking', 'ticket_type', 'payment', 'detail');
export const TrialLabelSchema = Schema.Literal('human', 'macro', 'none');

// ─── Summary ───────────────────────────────────────────────
export const TrialSummarySchema = Schema.Struct({
  stage: TrialStageSchema,
  durationMs: Schema.Number,
  clickCount: Schema.Number,
  eventCount: Schema.Number,
  windowCount: Schema.Number,
  selectedSeats: Schema.Array(Schema.String),
  label: TrialLabelSchema,
});

// ─── Metrics (Flat Structure - 34 Features) ────────────────
export const TrialMetricsSchema = Schema.Struct({
  // Click/Timing (15)
  time_to_first_click_ms: Schema.Union(Schema.Number, Schema.Null),
  time_from_element_visible_to_click_ms: Schema.Union(Schema.Number, Schema.Null),
  time_from_element_clickable_to_click_ms: Schema.Union(Schema.Number, Schema.Null),
  inter_click_interval_ms: Schema.Union(Schema.Number, Schema.Null),
  click_sequence_consistency_score: Schema.Union(Schema.Number, Schema.Null),
  click_position_repeat_rate: Schema.Union(Schema.Number, Schema.Null),
  click_offset_from_element_center_px: Schema.Union(Schema.Number, Schema.Null),
  click_offset_variance_px: Schema.Union(Schema.Number, Schema.Null),
  double_click_rate: Schema.Union(Schema.Number, Schema.Null),
  misclick_rate: Schema.Union(Schema.Number, Schema.Null),
  reclick_rate: Schema.Union(Schema.Number, Schema.Null),
  pre_click_mousemove_count: Schema.Union(Schema.Number, Schema.Null),
  pre_click_hover_time_ms: Schema.Union(Schema.Number, Schema.Null),
  pre_click_scroll_flag: Schema.Number,
  immediate_post_render_click_rate: Schema.Union(Schema.Number, Schema.Null),

  // Mouse (17)
  mouse_total_travel_distance_px: Schema.Union(Schema.Number, Schema.Null),
  mouse_avg_speed_px_per_ms: Schema.Union(Schema.Number, Schema.Null),
  mouse_max_speed_px_per_ms: Schema.Union(Schema.Number, Schema.Null),
  mouse_speed_change_mean: Schema.Union(Schema.Number, Schema.Null),
  mouse_acceleration_mean: Schema.Union(Schema.Number, Schema.Null),
  mouse_jerk_mean: Schema.Union(Schema.Number, Schema.Null),
  mouse_path_straightness_score: Schema.Union(Schema.Number, Schema.Null),
  mouse_path_curvature_mean: Schema.Union(Schema.Number, Schema.Null),
  mouse_direction_change_count: Schema.Union(Schema.Number, Schema.Null),
  mouse_overshoot_flag: Schema.Number,
  mouse_hover_dwell_time_ms: Schema.Union(Schema.Number, Schema.Null),
  mouse_stop_segment_count: Schema.Union(Schema.Number, Schema.Null),
  mousemove_event_rate: Schema.Union(Schema.Number, Schema.Null),
  pre_click_path_300ms_total_distance_px: Schema.Number,
  pre_click_path_300ms_straightness: Schema.Number,
  pre_click_path_500ms_total_distance_px: Schema.Number,
  pre_click_path_500ms_straightness: Schema.Number,
  inter_element_move_interval_std_ms: Schema.Union(Schema.Number, Schema.Null),
  edge_or_fixed_point_visit_rate: Schema.Union(Schema.Number, Schema.Null),

});

// ─── Base Event Row ─────────────────────────────────────────
const BaseEventRowSchema = Schema.Struct({
  trial_id: Schema.Number,
  event_index: Schema.Number,
  relative_ms: Schema.Number,
  stage: TrialStageSchema,
  track_id: Schema.Union(Schema.String, Schema.Null),
});

// ─── Specific Event Rows ────────────────────────────────────
export const MousemoveEventRowSchema = Schema.extend(BaseEventRowSchema, Schema.Struct({
  event_type: Schema.Literal('mousemove'),
  x: Schema.Number,
  y: Schema.Number,
}));

export const ClickEventRowSchema = Schema.extend(BaseEventRowSchema, Schema.Struct({
  event_type: Schema.Literal('click'),
  x: Schema.Number,
  y: Schema.Number,
  time_from_visible_ms: Schema.Union(Schema.Number, Schema.Null),
  time_from_clickable_ms: Schema.Union(Schema.Number, Schema.Null),
  inter_click_interval_ms: Schema.Union(Schema.Number, Schema.Null),
  pre_click_mousemove_count: Schema.Number,
  pre_click_hover_time_ms: Schema.Union(Schema.Number, Schema.Null),
  pre_click_scroll_flag: Schema.Number,
  offset_distance_px: Schema.Union(Schema.Number, Schema.Null),
  is_double_click: Schema.Number,
  is_reclick: Schema.Number,
  is_misclick: Schema.Number,
}));

export const ScrollEventRowSchema = Schema.extend(BaseEventRowSchema, Schema.Struct({
  event_type: Schema.Literal('scroll'),
  scroll_y: Schema.Number,
}));

export const FocusEventRowSchema = Schema.extend(BaseEventRowSchema, Schema.Struct({
  event_type: Schema.Literal('focus'),
}));

export const KeydownEventRowSchema = Schema.extend(BaseEventRowSchema, Schema.Struct({
  event_type: Schema.Literal('keydown'),
  key: Schema.String,
  code: Schema.String,
  is_repeat: Schema.Number,
}));

export const KeyupEventRowSchema = Schema.extend(BaseEventRowSchema, Schema.Struct({
  event_type: Schema.Literal('keyup'),
  key: Schema.String,
  code: Schema.String,
  hold_ms: Schema.Union(Schema.Number, Schema.Null),
}));

export const PasteEventRowSchema = Schema.extend(BaseEventRowSchema, Schema.Struct({
  event_type: Schema.Literal('paste'),
}));

// ─── Union of all events ────────────────────────────────────
export const EventRowSchema = Schema.Union(
  MousemoveEventRowSchema,
  ClickEventRowSchema,
  ScrollEventRowSchema,
  FocusEventRowSchema,
  KeydownEventRowSchema,
  KeyupEventRowSchema,
  PasteEventRowSchema
);

// ─── WindowRow ──────────────────────────────────────────────
export const WindowRowSchema = Schema.Struct({
  trial_id: Schema.Number,
  snapshot_index: Schema.Number,
  relative_ms: Schema.Number,
  stage: TrialStageSchema,
  click_count: Schema.Number,
  move_count: Schema.Number,
  scroll_count: Schema.Number,
});

// ─── Trial JSON (최상위) ────────────────────────────────────
export const TrialJSONSchema = Schema.Struct({
  trialId: Schema.Number,
  userId: Schema.Union(Schema.Number, Schema.Null),
  sessionId: Schema.String,
  label: TrialLabelSchema,
  summary: TrialSummarySchema,
  metrics: TrialMetricsSchema,
  eventRows: Schema.Array(EventRowSchema),
  windowRows: Schema.Array(WindowRowSchema),
});

// ─── Derived Types ──────────────────────────────────────────
export type TrialStage = Schema.Schema.Type<typeof TrialStageSchema>;
export type TrialLabel = Schema.Schema.Type<typeof TrialLabelSchema>;
export type TrialSummary = Schema.Schema.Type<typeof TrialSummarySchema>;
export type TrialMetrics = Schema.Schema.Type<typeof TrialMetricsSchema>;

export type MousemoveEventRow = Schema.Schema.Type<typeof MousemoveEventRowSchema>;
export type ClickEventRow = Schema.Schema.Type<typeof ClickEventRowSchema>;
export type ScrollEventRow = Schema.Schema.Type<typeof ScrollEventRowSchema>;
export type FocusEventRow = Schema.Schema.Type<typeof FocusEventRowSchema>;
export type KeydownEventRow = Schema.Schema.Type<typeof KeydownEventRowSchema>;
export type KeyupEventRow = Schema.Schema.Type<typeof KeyupEventRowSchema>;
export type PasteEventRow = Schema.Schema.Type<typeof PasteEventRowSchema>;

export type EventRow = Schema.Schema.Type<typeof EventRowSchema>;
export type WindowRow = Schema.Schema.Type<typeof WindowRowSchema>;
export type TrialJSON = Schema.Schema.Type<typeof TrialJSONSchema>;

// ─── API Schema Helpers ──────────────────────────────────────
export const createApiResponseSchema = (dataSchema: Schema.Schema.AnyNoContext) =>
  Schema.Struct({
    status: Schema.Number,
    message: Schema.String,
    data: dataSchema,
  });
