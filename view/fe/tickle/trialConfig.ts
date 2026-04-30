/**
 * TrialCollector 설정 파일
 *
 * 이 파일에서 행동 데이터 수집 엔진의 각종 기준값과 시간 간격을 조정할 수 있습니다.
 */

export const TRIAL_CONFIG = {
  // ── 수집 간격 (Intervals / Throttling) ──

  /** 전체 요약 스냅샷을 찍는 주기 (기본: 2000ms = 2초) */
  SNAPSHOT_INTERVAL_MS: 2000,

  /** 마우스 이동(mousemove) 이벤트를 수집하는 최소 간격 (기본: 50ms = 0.05초) */
  MOUSE_THROTTLE_MS: 50,

  // ── 클릭 패턴 판단 기준 (Thresholds) ──

  /** 더블 클릭으로 판단하는 두 클릭 사이의 최대 시간 간격 (기본: 400ms) */
  DOUBLE_CLICK_THRESHOLD_MS: 400,

  /** 동일한 요소를 다시 클릭한 것(Re-click)으로 판단하는 최대 시간 간격 (기본: 600ms) */
  RECLICK_THRESHOLD_MS: 600,

  /** 클릭 직전의 마우스 이동/스크롤 패턴을 분석하기 위한 시간 창 (기본: 500ms) */
  PRE_CLICK_WINDOW_MS: 500,

  // ── 화면 엣지 (Edge) 탐지 기준 ──

  /** 화면 가장자리(Edge)에 마우스가 도달했다고 판단하는 여백 (기본: 20px) */
  EDGE_MARGIN_PX: 20,

  // ── 봇 탐지 (Bot Detection) 옵션 ──

  /** 매크로/봇 접근 시 차단 페이지(/blocked)로 강제 이동시킬지 여부 (기본: true) */
  ENABLE_BOT_DETECTOR: true,
};
