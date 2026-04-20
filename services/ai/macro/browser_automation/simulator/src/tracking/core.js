export const seatRows = 9;
export const seatCols = 12;
export const queueDuration = 5;

export const prices = {
  VIP: 170000,
  R: 130000,
  S: 99000,
  A: 77000,
};

export const gradeColors = {
  VIP: "#10b981",
  R: "#3b82f6",
  S: "#8b5cf6",
  A: "#64748b",
};

export function buildSeats() {
  const grades = ["VIP", "R", "S", "A"];
  const data = [];

  for (let r = 0; r < seatRows; r += 1) {
    for (let c = 0; c < seatCols; c += 1) {
      const rowChar = String.fromCharCode(65 + r);
      const grade = grades[Math.min(3, Math.floor(r / 2.5))];
      const disabled = (r + c) % 11 === 0;

      data.push({
        id: `${rowChar}${c + 1}`,
        row: rowChar,
        col: c + 1,
        grade,
        zone: c < 4 ? "LEFT" : c < 8 ? "CENTER" : "RIGHT",
        available: !disabled,
      });
    }
  }

  return data;
}

export function createSession(trialId = null) {
  return {
    trialId,
    active: false,
    startTs: null,
    freezeTs: null,
    clicks: [],
    moves: [],
    scrolls: [],
    hoverSamples: [],
    currentHover: null,
    visibleAt: {},
    clickableAt: {},
    eventRows: [],
    windowRows: [],
    lastSnapshotTs: null,
  };
}

export function relativeMs(session, ts) {
  if (session.startTs == null) return 0;
  return Math.max(0, ts - session.startTs);
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values) {
  if (values.length < 2) return null;
  const avg = mean(values);
  return mean(values.map((value) => (value - avg) ** 2));
}

function std(values) {
  const value = variance(values);
  return value == null ? null : Math.sqrt(value);
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function angleBetween(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function summarizePath(moves, endTs, windowMs) {
  const subset = moves.filter((move) => endTs - move.ts <= windowMs);
  if (subset.length < 2) return "n/a";

  let totalDistance = 0;
  for (let i = 1; i < subset.length; i += 1) {
    totalDistance += distance(subset[i - 1], subset[i]);
  }

  const directDistance = distance(subset[0], subset[subset.length - 1]);
  const straightness = totalDistance > 0 ? directDistance / totalDistance : 0;

  return `${totalDistance.toFixed(1)}px | straight ${straightness.toFixed(2)}`;
}

export function resolveCategory(trackId) {
  if (trackId === "queue-skip") return "queue";
  if (trackId === "captcha-confirm") return "captcha-confirm";
  if (trackId === "captcha-input") return "captcha-input";
  if (trackId === "seat-search") return "seat-action";
  if (trackId === "proceed-booking") return "seat-submit";
  if (trackId.startsWith("seat-")) return "seat-action";
  return "other";
}

function categoryOrder(category) {
  if (category === "queue") return 1;
  if (category === "captcha-confirm") return 2;
  if (category === "captcha-input") return 2;
  if (category === "seat-action") return 3;
  if (category === "seat-submit") return 4;
  return 0;
}

export function isValidTrackForStage(stage, trackId) {
  if (stage === "queue") return trackId === "queue-skip";
  if (stage === "captcha") return trackId === "captcha-confirm" || trackId === "captcha-input";
  if (stage === "booking") {
    return trackId === "seat-search" || trackId === "proceed-booking" || trackId.startsWith("seat-");
  }
  return false;
}

export function deriveMetrics(session) {
  const clicks = session.clicks;
  const moves = session.moves;
  const totalWindowMs =
    session.startTs == null ? 0 : Math.max(1, (session.freezeTs ?? performance.now()) - session.startTs);

  const repeatPositionCount = clicks.filter((click, index) =>
    clicks.slice(0, index).some((prev) => Math.hypot(prev.x - click.x, prev.y - click.y) <= 6),
  ).length;

  const clickOrders = clicks.map((click) => categoryOrder(click.category));
  let consistentTransitions = 0;
  let totalTransitions = 0;
  for (let i = 1; i < clickOrders.length; i += 1) {
    totalTransitions += 1;
    if (clickOrders[i] >= clickOrders[i - 1]) consistentTransitions += 1;
  }
  const sequenceScore = totalTransitions === 0 ? null : consistentTransitions / totalTransitions;

  const clickOffsets = clicks.map((click) => click.offsetDistance).filter((value) => value != null);
  const visibleTimes = clicks.map((click) => click.timeFromVisible).filter((value) => value != null);
  const clickableTimes = clicks.map((click) => click.timeFromClickable).filter((value) => value != null);
  const interClicks = clicks.map((click) => click.interClickInterval).filter((value) => value != null);
  const preClickMoves = clicks.map((click) => click.preClickMousemoveCount);
  const preClickHover = clicks.map((click) => click.preClickHoverTime);
  const postRenderRate = clicks.length ? clicks.filter((click) => click.immediatePostRender).length / clicks.length : null;

  const moveSegments = [];
  for (let i = 1; i < moves.length; i += 1) {
    const prev = moves[i - 1];
    const next = moves[i];
    const dt = next.ts - prev.ts;
    if (dt <= 0) continue;
    const dist = distance(prev, next);
    moveSegments.push({
      dt,
      dist,
      speed: dist / dt,
      angle: angleBetween(prev, next),
    });
  }

  const totalTravel = moveSegments.reduce((sum, segment) => sum + segment.dist, 0);
  const avgSpeed = totalWindowMs > 0 ? totalTravel / totalWindowMs : null;
  const maxSpeed = moveSegments.length ? Math.max(...moveSegments.map((segment) => segment.speed)) : null;

  const speedChanges = [];
  const accelerations = [];
  const jerks = [];
  const directionChanges = [];
  let stopSegments = 0;
  for (let i = 1; i < moveSegments.length; i += 1) {
    const prev = moveSegments[i - 1];
    const next = moveSegments[i];
    const speedDelta = Math.abs(next.speed - prev.speed);
    speedChanges.push(speedDelta);
    const accel = speedDelta / Math.max(next.dt, 1);
    accelerations.push(accel);
    if (i > 1) {
      const prevAccel = accelerations[i - 2];
      jerks.push(Math.abs(accel - prevAccel) / Math.max(next.dt, 1));
    }
    const angleDelta = Math.abs(next.angle - prev.angle);
    directionChanges.push(Math.min(angleDelta, Math.PI * 2 - angleDelta));
    if (next.dt >= 120 || next.speed < 0.02) stopSegments += 1;
  }

  const directDistance = moves.length >= 2 ? distance(moves[0], moves[moves.length - 1]) : null;
  const straightness = totalTravel > 0 && directDistance != null ? directDistance / totalTravel : null;
  const curvatureMean =
    moveSegments.length >= 2
      ? mean(
          directionChanges.map((change, index) => {
            const span = moveSegments[index + 1]?.dist ?? 1;
            return change / Math.max(span, 1);
          }),
        )
      : null;

  const directionChangeCount = directionChanges.filter((change) => change > Math.PI / 6).length;

  const overshootFlag = clicks.some((click) => {
    if (click.targetCenterX == null || click.targetCenterY == null) return false;
    const preMoves = moves.filter((move) => click.ts - move.ts <= 500 && click.ts - move.ts >= 0);
    if (preMoves.length < 3) return false;
    const distances = preMoves.map((move) => Math.hypot(move.x - click.targetCenterX, move.y - click.targetCenterY));
    const minDistance = Math.min(...distances);
    const minIndex = distances.indexOf(minDistance);
    const afterMinMax = Math.max(...distances.slice(minIndex));
    return minDistance < 12 && afterMinMax - minDistance > 24;
  });

  const edgeVisitRate =
    moves.length === 0
      ? null
      : moves.filter((move) => {
          const edge = 20;
          return (
            move.x <= edge ||
            move.y <= edge ||
            move.x >= window.innerWidth - edge ||
            move.y >= window.innerHeight - edge
          );
        }).length / moves.length;

  const interElementIntervals = [];
  for (let i = 1; i < clicks.length; i += 1) {
    if (clicks[i].trackId !== clicks[i - 1].trackId) {
      interElementIntervals.push(clicks[i].ts - clicks[i - 1].ts);
    }
  }

  const latestClickTs = clicks.length ? clicks[clicks.length - 1].ts : performance.now();

  return {
    time_to_first_click_ms: clicks[0] ? clicks[0].ts - session.startTs : null,
    time_from_element_visible_to_click_ms: mean(visibleTimes),
    time_from_element_clickable_to_click_ms: mean(clickableTimes),
    inter_click_interval_ms: mean(interClicks),
    click_sequence_consistency_score: sequenceScore,
    click_position_repeat_rate: clicks.length ? repeatPositionCount / clicks.length : null,
    click_offset_from_element_center_px: mean(clickOffsets),
    click_offset_variance_px: variance(clickOffsets),
    double_click_rate: clicks.length ? clicks.filter((click) => click.isDoubleClick).length / clicks.length : null,
    misclick_rate: clicks.length ? clicks.filter((click) => click.isMisclick).length / clicks.length : null,
    reclick_rate: clicks.length ? clicks.filter((click) => click.isReclick).length / clicks.length : null,
    pre_click_mousemove_count: mean(preClickMoves),
    pre_click_hover_time_ms: mean(preClickHover),
    pre_click_scroll_flag: clicks.length ? clicks.filter((click) => click.preClickScrollFlag).length / clicks.length : null,
    immediate_post_render_click_rate: postRenderRate,
    mouse_total_travel_distance_px: totalTravel,
    mouse_avg_speed_px_per_ms: avgSpeed,
    mouse_max_speed_px_per_ms: maxSpeed,
    mouse_speed_change_mean: mean(speedChanges),
    mouse_acceleration_mean: mean(accelerations),
    mouse_jerk_mean: mean(jerks),
    mouse_path_straightness_score: straightness,
    mouse_path_curvature_mean: curvatureMean,
    mouse_direction_change_count: directionChangeCount,
    mouse_overshoot_flag: overshootFlag ? 1 : 0,
    mouse_hover_dwell_time_ms: mean(session.hoverSamples.map((sample) => sample.duration)),
    mouse_stop_segment_count: stopSegments,
    mousemove_event_rate: moves.length ? moves.length / (totalWindowMs / 1000) : null,
    pre_click_mouse_path_pattern_300ms: summarizePath(moves, latestClickTs, 300),
    pre_click_mouse_path_pattern_500ms: summarizePath(moves, latestClickTs, 500),
    inter_element_move_interval_std_ms: std(interElementIntervals),
    edge_or_fixed_point_visit_rate: edgeVisitRate,
  };
}

export function formatMetricValue(value) {
  if (value == null || Number.isNaN(value)) return "-";
  if (typeof value === "string") return value;
  if (Math.abs(value) >= 1000) return value.toFixed(0);
  if (Math.abs(value) >= 100) return value.toFixed(1);
  if (Math.abs(value) >= 10) return value.toFixed(2);
  return value.toFixed(4);
}
