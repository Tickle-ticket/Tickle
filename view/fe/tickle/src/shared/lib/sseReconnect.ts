/**
 * SSE 재연결 대기 시간을 계산합니다.
 *
 * <p>대기열·좌석·봇탐지가 각자 다른 방식으로 SSE를 다루고 있어(커스텀 이벤트 파싱,
 * 인증 토큰, 상태 전이가 제각각) 훅 하나로 합치기는 어렵습니다. 대신 재연결
 * 정책만 여기에 모아 모두가 같은 규칙을 따르게 합니다.</p>
 */

/** 첫 재연결까지 기다리는 시간. */
const BASE_DELAY_MS = 1000;

/**
 * 재연결 간격의 상한.
 *
 * 무한정 늘리면 서버가 돌아와도 한참 뒤에야 붙는다. 30초면 사용자가 기다릴 만한
 * 최대치이면서 서버에 부담도 주지 않는다.
 */
const MAX_DELAY_MS = 30_000;

/**
 * 대기 시간에 더할 무작위 폭(±20%).
 *
 * 서버가 재시작되면 끊겼던 클라이언트가 전부 같은 시각에 재연결을 시도한다.
 * 티켓팅처럼 동시 접속이 많은 서비스에서는 이 동시 재접속이 서버를 다시
 * 넘어뜨릴 수 있어(thundering herd), 시각을 흩뜨린다.
 */
const JITTER_RATIO = 0.2;

/**
 * 시도 횟수에 따른 재연결 대기 시간을 구합니다.
 *
 * <p>1초 → 2초 → 4초 → 8초 → 16초 → 30초(상한)로 늘어나며, 각 값에 ±20%의
 * 무작위 편차가 붙습니다. 고정 간격으로 계속 두드리면 서버가 죽었을 때 모든
 * 클라이언트가 같은 주기로 부하를 주게 됩니다.</p>
 *
 * @param attempt 몇 번째 재연결인지 (0부터 시작)
 * @param random  테스트에서 결과를 고정하기 위한 난수 주입구
 * @return 대기할 밀리초
 */
export const getReconnectDelay = (attempt: number, random: () => number = Math.random): number => {
  const exponential = Math.min(BASE_DELAY_MS * 2 ** Math.max(0, attempt), MAX_DELAY_MS);
  const jitter = exponential * JITTER_RATIO * (random() * 2 - 1);
  return Math.max(0, Math.round(exponential + jitter));
};

/**
 * 더 재연결해볼 가치가 있는지 판단합니다.
 *
 * <p>상한을 두는 이유는 서버 부하가 아니라 화면입니다. 영원히 재시도하면 사용자는
 * "연결 중"만 보며 무엇이 잘못됐는지 알 수 없습니다. 상한에 닿으면 에러 화면으로
 * 전환해 다시 시도할지 선택하게 합니다.</p>
 *
 * @param attempt     지금까지의 연속 실패 횟수
 * @param maxAttempts 허용할 최대 횟수
 */
export const shouldRetry = (attempt: number, maxAttempts: number): boolean => attempt < maxAttempts;

/**
 * 대기열 SSE의 최대 재연결 횟수.
 *
 * <p>대기 순번을 잃으면 처음부터 다시 줄을 서야 하므로 넉넉하게 잡습니다.
 * 백오프까지 고려하면 약 2분간 재시도합니다.</p>
 */
export const QUEUE_MAX_RECONNECT_ATTEMPTS = 8;

/**
 * 좌석 SSE의 최대 재연결 횟수.
 *
 * <p>좌석 동기화가 끊기면 남이 잡은 자리를 모른 채 선점을 시도하게 됩니다.
 * 다만 초기 좌석 정보는 이미 받아둔 상태라 대기열만큼 치명적이지는 않습니다.</p>
 */
export const SEAT_MAX_RECONNECT_ATTEMPTS = 5;

/**
 * 봇 탐지 SSE의 최대 재연결 횟수.
 *
 * <p>끊긴 채로 두면 서버가 재검증(CAPTCHA)을 요구해도 받지 못해, 봇 판정이
 * 사용자에게 전달되지 않습니다. 예매 화면에 머무는 내내 열려 있어야 하므로
 * 좌석보다 넉넉하게 잡습니다.</p>
 */
export const BOT_DETECTION_MAX_RECONNECT_ATTEMPTS = 8;
