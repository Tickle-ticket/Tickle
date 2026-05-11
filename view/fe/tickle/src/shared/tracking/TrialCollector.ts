/**
 * TrialCollector — 행동 데이터 수집 엔진
 *
 * 순수 TypeScript 클래스. React 외부에서 동작하며
 * useRef로 인스턴스를 관리합니다.
 *
 * 예매 세션 동안 mousemove/click/scroll/keydown/keyup/focus/paste
 * 이벤트를 수집하고, 세션 종료 시 42개 feature를 계산하여
 * Trial JSON을 생성합니다.
 */

import type {
  TrialJSON,
  TrialMetrics,
  TrialSummary,
  TrialStage,
  TrialLabel,
  EventRow,
  WindowRow,
  ClickEventRow,
  MousemoveEventRow,
} from '../utils/schema';
import { Schema } from 'effect';
import { TrialJSONSchema } from '../utils/schema';

// ─── Helper Utilities ───────────────────────────────────────

/** 유클리드 거리 */
const dist = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

/** 평균 */
const mean = (arr: number[]): number | null =>
  arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;

/** 분산 */
const variance = (arr: number[]): number | null => {
  if (arr.length < 2) return null;
  const m = mean(arr)!;
  return arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length;
};

/** 표준편차 */
const std = (arr: number[]): number | null => {
  const v = variance(arr);
  return v === null ? null : Math.sqrt(v);
};

// ─── Collector Class ────────────────────────────────────────

import { TRIAL_CONFIG } from '@/trialConfig';

const {
  SNAPSHOT_INTERVAL_MS,
  MOUSE_THROTTLE_MS,
  DOUBLE_CLICK_THRESHOLD_MS,
  RECLICK_THRESHOLD_MS,
  PRE_CLICK_WINDOW_MS,
  EDGE_MARGIN_PX,
  RECENT_EVENT_WINDOW_SIZE,
} = TRIAL_CONFIG;

export class TrialCollector {
  // ─── Identity ─────────────────────────────────────────────
  private trialId: number;
  private userId: number | null = null;
  private sessionId: string;
  private label: TrialLabel = 'none';
  private startTs: number;
  private stage: TrialStage = 'captcha';

  // ─── Raw Data ─────────────────────────────────────────────
  private eventRows: EventRow[] = [];
  private windowRows: WindowRow[] = [];

  // ─── Counters ─────────────────────────────────────────────
  private eventIndex = 0;
  private snapshotIndex = 0;
  private clickCount = 0;
  private moveCount = 0;
  private scrollCount = 0;
  private lastMoveTs = 0;

  // ─── Click Tracking ──────────────────────────────────────
  private lastClickTs: number | null = null;
  private lastClickTrackId: string | null = null;
  private lastScrollTs: number | null = null;

  // ─── Keyboard Tracking ────────────────────────────────────
  private captchaFocusTs: number | null = null;
  private keydownTimestamps: Map<string, number> = new Map(); // code → ts
  private pasteCount = 0;

  // ─── Snapshot Timer ──────────────────────────────────────
  private snapshotTimer: ReturnType<typeof setInterval> | null = null;

  // ─── Screen Size (for edge detection) ────────────────────
  private screenW = 0;
  private screenH = 0;

  // ─── Selected Seats ──────────────────────────────────────
  private selectedSeats: string[] = [];

  // ─── Finalized Guard ─────────────────────────────────────
  private finalized = false;

  // ─── Stage Flush Tracking ────────────────────────────────
  private stageStartTs: number;

  constructor(options?: { trialId?: number; userId?: number | null; initialStage?: TrialStage }) {
    this.trialId = options?.trialId ?? Date.now();
    this.userId = options?.userId ?? null;
    this.stage = options?.initialStage ?? 'captcha';
    this.sessionId = this.stage;
    this.startTs = Date.now();
    this.stageStartTs = this.startTs;
    if (typeof window !== 'undefined') {
      this.screenW = window.innerWidth;
      this.screenH = window.innerHeight;
    }
    this.startSnapshots();
  }

  // ─── Public API ──────────────────────────────────────────

  setStage(stage: TrialStage): TrialJSON | null {
    if (stage === this.stage) return null;

    // 이전 단계 데이터 flush
    const flushed = this.flushStage();

    this.stage = stage;
    this.sessionId = stage;
    this.stageStartTs = Date.now();

    return flushed;
  }

  setLabel(label: TrialLabel) {
    this.label = label;
  }

  setSelectedSeats(seats: string[]) {
    this.selectedSeats = seats;
  }

  // ─── Event Collection Methods ────────────────────────────

  addMousemove(x: number, y: number) {
    const now = Date.now();
    if (now - this.lastMoveTs < MOUSE_THROTTLE_MS) return;
    this.lastMoveTs = now;
    this.moveCount++;

    this.eventRows.push({
      trial_id: this.trialId,
      event_index: ++this.eventIndex,
      relative_ms: now - this.startTs,
      stage: this.stage,
      event_type: 'mousemove',
      track_id: null,
      x,
      y,
    });
  }

  addClick(x: number, y: number, trackId: string | null, element?: HTMLElement | null) {
    const now = Date.now();
    this.clickCount++;

    // Compute partial features
    const interClickInterval = this.lastClickTs !== null ? now - this.lastClickTs : null;
    const isDoubleClick = interClickInterval !== null && interClickInterval < DOUBLE_CLICK_THRESHOLD_MS ? 1 : 0;
    const isReclick = (
      interClickInterval !== null &&
      interClickInterval < RECLICK_THRESHOLD_MS &&
      trackId !== null &&
      trackId === this.lastClickTrackId
    ) ? 1 : 0;

    // Pre-click mousemove count (500ms window)
    const windowStart = now - PRE_CLICK_WINDOW_MS;
    const preClickMoves = this.eventRows.filter(
      e => e.event_type === 'mousemove' && e.relative_ms >= (windowStart - this.startTs)
    );

    // Pre-click scroll flag
    const preClickScrollFlag = this.lastScrollTs !== null && (now - this.lastScrollTs) < PRE_CLICK_WINDOW_MS ? 1 : 0;

    // Offset from element center
    let offsetDistance: number | null = null;
    if (element) {
      const rect = element.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      offsetDistance = dist(x, y, cx, cy);
    }

    // Pre-click hover time: time since last mousemove before click
    let preClickHoverTime: number | null = null;
    const moves = this.getMovesArray();
    if (moves.length > 0) {
      const lastMove = moves[moves.length - 1];
      preClickHoverTime = now - (this.startTs + lastMove.relative_ms);
    }

    const row: ClickEventRow = {
      trial_id: this.trialId,
      event_index: ++this.eventIndex,
      relative_ms: now - this.startTs,
      stage: this.stage,
      event_type: 'click',
      track_id: trackId,
      x,
      y,
      time_from_visible_ms: null, // would need IntersectionObserver per element
      time_from_clickable_ms: null,
      inter_click_interval_ms: interClickInterval,
      pre_click_mousemove_count: preClickMoves.length,
      pre_click_hover_time_ms: preClickHoverTime,
      pre_click_scroll_flag: preClickScrollFlag,
      offset_distance_px: offsetDistance,
      is_double_click: isDoubleClick,
      is_reclick: isReclick,
      is_misclick: 0, // default; could be refined with domain logic
    };

    this.eventRows.push(row);
    this.lastClickTs = now;
    this.lastClickTrackId = trackId;
  }

  addScroll(scrollY: number) {
    const now = Date.now();
    this.scrollCount++;
    this.lastScrollTs = now;

    this.eventRows.push({
      trial_id: this.trialId,
      event_index: ++this.eventIndex,
      relative_ms: now - this.startTs,
      stage: this.stage,
      event_type: 'scroll',
      track_id: null,
      scroll_y: scrollY,
    });
  }

  addFocus(trackId: string | null) {
    const now = Date.now();
    if (trackId === 'captcha-input' || this.stage === 'captcha') {
      this.captchaFocusTs = now;
    }

    this.eventRows.push({
      trial_id: this.trialId,
      event_index: ++this.eventIndex,
      relative_ms: now - this.startTs,
      stage: this.stage,
      event_type: 'focus',
      track_id: trackId,
    });
  }

  addKeydown(key: string, code: string, isRepeat: boolean) {
    const now = Date.now();
    this.keydownTimestamps.set(code, now);

    this.eventRows.push({
      trial_id: this.trialId,
      event_index: ++this.eventIndex,
      relative_ms: now - this.startTs,
      stage: this.stage,
      event_type: 'keydown',
      track_id: null,
      key,
      code,
      is_repeat: isRepeat ? 1 : 0,
    });
  }

  addKeyup(key: string, code: string) {
    const now = Date.now();
    const downTs = this.keydownTimestamps.get(code);
    const holdMs = downTs !== undefined ? now - downTs : null;
    this.keydownTimestamps.delete(code);

    this.eventRows.push({
      trial_id: this.trialId,
      event_index: ++this.eventIndex,
      relative_ms: now - this.startTs,
      stage: this.stage,
      event_type: 'keyup',
      track_id: null,
      key,
      code,
      hold_ms: holdMs,
    });
  }

  addPaste(trackId: string | null) {
    const now = Date.now();
    this.pasteCount++;

    this.eventRows.push({
      trial_id: this.trialId,
      event_index: ++this.eventIndex,
      relative_ms: now - this.startTs,
      stage: this.stage,
      event_type: 'paste',
      track_id: trackId,
    });
  }

  // ─── Snapshot Generation ─────────────────────────────────

  private startSnapshots() {
    this.snapshotTimer = setInterval(() => {
      this.takeSnapshot();
    }, SNAPSHOT_INTERVAL_MS);
  }

  private takeSnapshot() {
    const now = Date.now();
    this.windowRows.push({
      trial_id: this.trialId,
      snapshot_index: ++this.snapshotIndex,
      relative_ms: now - this.startTs,
      stage: this.stage,
      click_count: this.clickCount,
      move_count: this.moveCount,
      scroll_count: this.scrollCount,
    });
  }

  // ─── Finalize & Build TrialJSON ──────────────────────────

  finalize(): TrialJSON | null {
    if (this.finalized) {
      console.warn('[TrialCollector] Already finalized, skipping duplicate.');
      return null;
    }
    this.finalized = true;

    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }
    // Take final snapshot
    this.takeSnapshot();

    const durationMs = Date.now() - this.startTs;

    const recentEvents = this.eventRows.slice(-RECENT_EVENT_WINDOW_SIZE);

    const summary: TrialSummary = {
      stage: this.stage,
      durationMs,
      clickCount: recentEvents.filter(e => e.event_type === 'click').length,
      eventCount: recentEvents.length,
      windowCount: this.windowRows.length,
      selectedSeats: [...this.selectedSeats],
      label: this.label,
    };

    const metrics = this.computeMetricsFromEvents(recentEvents, durationMs);

    const rawTrial = {
      trialId: this.trialId,
      userId: this.userId,
      sessionId: this.sessionId,
      label: this.label,
      summary,
      metrics,
      eventRows: recentEvents,
      windowRows: this.windowRows,
    };

    return Schema.decodeUnknownSync(TrialJSONSchema)(rawTrial);
  }

  /**
   * 현재 단계의 데이터만 모아서 TrialJSON으로 반환 (단계별 전송용)
   */
  flushStage(): TrialJSON | null {
    const currentStage = this.stage;
    const stageEvents = this.eventRows.filter(e => e.stage === currentStage).slice(-RECENT_EVENT_WINDOW_SIZE);
    const stageWindows = this.windowRows.filter(w => w.stage === currentStage);

    if (stageEvents.length === 0) return null;

    const stageClicks = stageEvents.filter(e => e.event_type === 'click');
    const durationMs = Date.now() - this.stageStartTs;

    const summary: TrialSummary = {
      stage: currentStage,
      durationMs,
      clickCount: stageClicks.length,
      eventCount: stageEvents.length,
      windowCount: stageWindows.length,
      selectedSeats: [...this.selectedSeats],
      label: this.label,
    };

    // 해당 단계의 이벤트만으로 metrics 계산
    const metrics = this.computeMetricsFromEvents(stageEvents, durationMs);

    const rawTrial = {
      trialId: this.trialId,
      userId: this.userId,
      sessionId: currentStage,
      label: this.label,
      summary,
      metrics,
      eventRows: stageEvents,
      windowRows: stageWindows,
    };

    return Schema.decodeUnknownSync(TrialJSONSchema)(rawTrial);
  }

  destroy() {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }
  }

  // ─── Metrics Computation ─────────────────────────────────

  private getMovesArray(): MousemoveEventRow[] {
    return this.eventRows.filter(e => e.event_type === 'mousemove') as MousemoveEventRow[];
  }

  private getClicksArray(): ClickEventRow[] {
    return this.eventRows.filter(e => e.event_type === 'click') as ClickEventRow[];
  }

  private computeMetrics(durationMs: number): TrialMetrics {
    return this.computeMetricsFromEvents(this.eventRows, durationMs);
  }

  private computeMetricsFromEvents(events: EventRow[], durationMs: number): TrialMetrics {
    const moves = events.filter(e => e.event_type === 'mousemove') as MousemoveEventRow[];
    const clicks = events.filter(e => e.event_type === 'click') as ClickEventRow[];
    const keydowns = events.filter(e => e.event_type === 'keydown') as any[];
    const keyups = events.filter(e => e.event_type === 'keyup') as any[];

    return {
      // ── Click/Timing (15) ─────────────────────────────────
      time_to_first_click_ms: clicks.length > 0 ? clicks[0].relative_ms : null,
      time_from_element_visible_to_click_ms: mean(clicks.map(c => c.time_from_visible_ms).filter((v): v is number => v !== null)),
      time_from_element_clickable_to_click_ms: mean(clicks.map(c => c.time_from_clickable_ms).filter((v): v is number => v !== null)),
      inter_click_interval_ms: mean(clicks.map(c => c.inter_click_interval_ms).filter((v): v is number => v !== null)),
      click_sequence_consistency_score: this.computeClickSequenceConsistency(clicks),
      click_position_repeat_rate: this.computeClickPositionRepeatRate(clicks),
      click_offset_from_element_center_px: mean(clicks.map(c => c.offset_distance_px).filter((v): v is number => v !== null)),
      click_offset_variance_px: variance(clicks.map(c => c.offset_distance_px).filter((v): v is number => v !== null)),
      double_click_rate: clicks.length > 0 ? clicks.filter(c => c.is_double_click).length / clicks.length : null,
      misclick_rate: clicks.length > 0 ? clicks.filter(c => c.is_misclick).length / clicks.length : null,
      reclick_rate: clicks.length > 0 ? clicks.filter(c => c.is_reclick).length / clicks.length : null,
      pre_click_mousemove_count: mean(clicks.map(c => c.pre_click_mousemove_count)),
      pre_click_hover_time_ms: mean(clicks.map(c => c.pre_click_hover_time_ms).filter((v): v is number => v !== null)),
      pre_click_scroll_flag: clicks.length > 0 ? clicks.filter(c => c.pre_click_scroll_flag).length / clicks.length : 0,
      immediate_post_render_click_rate: null,

      // ── Mouse (17) ────────────────────────────────────────
      ...this.computeMouseMetrics(moves, clicks, durationMs),

    };
  }

  // ── Click Sequence Consistency ───────────────────────────
  private computeClickSequenceConsistency(clicks: ClickEventRow[]): number | null {
    if (clicks.length < 2) return null;
    let consistent = 0;
    for (let i = 1; i < clicks.length; i++) {
      // If track_ids follow a non-decreasing pattern
      if (clicks[i].track_id && clicks[i - 1].track_id) {
        if (clicks[i].track_id! >= clicks[i - 1].track_id!) consistent++;
      }
    }
    return consistent / (clicks.length - 1);
  }

  // ── Click Position Repeat Rate ──────────────────────────
  private computeClickPositionRepeatRate(clicks: ClickEventRow[]): number | null {
    if (clicks.length < 2) return null;
    let repeats = 0;
    for (let i = 1; i < clicks.length; i++) {
      for (let j = 0; j < i; j++) {
        if (dist(clicks[i].x, clicks[i].y, clicks[j].x, clicks[j].y) < 6) {
          repeats++;
          break;
        }
      }
    }
    return repeats / clicks.length;
  }

  // ── Mouse Metrics ───────────────────────────────────────
  private computeMouseMetrics(moves: MousemoveEventRow[], clicks: ClickEventRow[], durationMs: number) {
    if (moves.length < 2) {
      return {
        mouse_total_travel_distance_px: moves.length === 0 ? 0 : null,
        mouse_avg_speed_px_per_ms: null,
        mouse_max_speed_px_per_ms: null,
        mouse_speed_change_mean: null,
        mouse_acceleration_mean: null,
        mouse_jerk_mean: null,
        mouse_path_straightness_score: null,
        mouse_path_curvature_mean: null,
        mouse_direction_change_count: null,
        mouse_overshoot_flag: 0,
        mouse_hover_dwell_time_ms: null,
        mouse_stop_segment_count: null,
        mousemove_event_rate: durationMs > 0 ? moves.length / (durationMs / 1000) : null,
        pre_click_path_300ms_total_distance_px: 0,
        pre_click_path_300ms_straightness: 0,
        pre_click_path_500ms_total_distance_px: 0,
        pre_click_path_500ms_straightness: 0,
        inter_element_move_interval_std_ms: null,
        edge_or_fixed_point_visit_rate: null,
      };
    }

    // Segment calculations
    const segments: { dist: number; dt: number; speed: number; angle: number }[] = [];
    let totalDist = 0;

    for (let i = 1; i < moves.length; i++) {
      const d = dist(moves[i].x, moves[i].y, moves[i - 1].x, moves[i - 1].y);
      const dt = Math.max(moves[i].relative_ms - moves[i - 1].relative_ms, 1);
      const speed = d / dt;
      const angle = Math.atan2(moves[i].y - moves[i - 1].y, moves[i].x - moves[i - 1].x);
      totalDist += d;
      segments.push({ dist: d, dt, speed, angle });
    }

    const speeds = segments.map(s => s.speed);
    const maxSpeed = Math.max(...speeds);

    // Speed changes
    const speedChanges: number[] = [];
    for (let i = 1; i < speeds.length; i++) {
      speedChanges.push(Math.abs(speeds[i] - speeds[i - 1]));
    }

    // Accelerations
    const accels: number[] = [];
    for (let i = 1; i < segments.length; i++) {
      accels.push(Math.abs(speeds[i] - speeds[i - 1]) / Math.max(segments[i].dt, 1));
    }

    // Jerk
    const jerks: number[] = [];
    for (let i = 1; i < accels.length; i++) {
      jerks.push(Math.abs(accels[i] - accels[i - 1]) / Math.max(segments[i + 1]?.dt ?? 1, 1));
    }

    // Straightness
    const startEnd = dist(moves[0].x, moves[0].y, moves[moves.length - 1].x, moves[moves.length - 1].y);
    const straightness = totalDist > 0 ? startEnd / totalDist : null;

    // Direction changes (> PI/6)
    let dirChanges = 0;
    const curvatures: number[] = [];
    for (let i = 1; i < segments.length; i++) {
      let dAngle = segments[i].angle - segments[i - 1].angle;
      // Normalize to [-PI, PI]
      while (dAngle > Math.PI) dAngle -= 2 * Math.PI;
      while (dAngle < -Math.PI) dAngle += 2 * Math.PI;
      if (Math.abs(dAngle) > Math.PI / 6) dirChanges++;
      if (segments[i].dist > 0) {
        curvatures.push(Math.abs(dAngle) / segments[i].dist);
      }
    }

    // Stop segments (dt >= 120ms or speed < 0.02)
    const stopCount = segments.filter(s => s.dt >= 120 || s.speed < 0.02).length;

    // Edge visits
    let edgeVisits = 0;
    for (const m of moves) {
      if (m.x < EDGE_MARGIN_PX || m.x > this.screenW - EDGE_MARGIN_PX ||
          m.y < EDGE_MARGIN_PX || m.y > this.screenH - EDGE_MARGIN_PX) {
        edgeVisits++;
      }
    }

    // Pre-click path patterns
    const preClick300 = this.computePreClickPath(moves, clicks, 300);
    const preClick500 = this.computePreClickPath(moves, clicks, 500);

    // Inter-element move interval std
    const elementIntervals: number[] = [];
    for (let i = 1; i < clicks.length; i++) {
      if (clicks[i].track_id !== clicks[i - 1].track_id) {
        elementIntervals.push(clicks[i].relative_ms - clicks[i - 1].relative_ms);
      }
    }

    return {
      mouse_total_travel_distance_px: totalDist,
      mouse_avg_speed_px_per_ms: durationMs > 0 ? totalDist / durationMs : null,
      mouse_max_speed_px_per_ms: maxSpeed,
      mouse_speed_change_mean: mean(speedChanges),
      mouse_acceleration_mean: mean(accels),
      mouse_jerk_mean: mean(jerks),
      mouse_path_straightness_score: straightness,
      mouse_path_curvature_mean: mean(curvatures),
      mouse_direction_change_count: dirChanges,
      mouse_overshoot_flag: 0, // simplified
      mouse_hover_dwell_time_ms: null, // would need hover in/out tracking
      mouse_stop_segment_count: stopCount,
      mousemove_event_rate: durationMs > 0 ? moves.length / (durationMs / 1000) : null,
      pre_click_path_300ms_total_distance_px: preClick300.distance,
      pre_click_path_300ms_straightness: preClick300.straightness,
      pre_click_path_500ms_total_distance_px: preClick500.distance,
      pre_click_path_500ms_straightness: preClick500.straightness,
      inter_element_move_interval_std_ms: std(elementIntervals),
      edge_or_fixed_point_visit_rate: moves.length > 0 ? edgeVisits / moves.length : null,
    };
  }

  private computePreClickPath(moves: MousemoveEventRow[], clicks: ClickEventRow[], windowMs: number): { distance: number, straightness: number } {
    if (clicks.length === 0 || moves.length === 0) return { distance: 0, straightness: 0 };

    const lastClick = clicks[clicks.length - 1];
    const windowStart = lastClick.relative_ms - windowMs;
    const windowMoves = moves.filter(m => m.relative_ms >= windowStart && m.relative_ms <= lastClick.relative_ms);

    if (windowMoves.length < 2) return { distance: 0, straightness: 0 };

    let totalDist = 0;
    for (let i = 1; i < windowMoves.length; i++) {
      totalDist += dist(windowMoves[i].x, windowMoves[i].y, windowMoves[i - 1].x, windowMoves[i - 1].y);
    }

    const directDist = dist(
      windowMoves[0].x, windowMoves[0].y,
      windowMoves[windowMoves.length - 1].x, windowMoves[windowMoves.length - 1].y
    );
    const straightness = totalDist > 0 ? directDist / totalDist : 0;

    return { 
      distance: Math.round(totalDist), 
      straightness: Number(straightness.toFixed(2)) 
    };
  }


}
