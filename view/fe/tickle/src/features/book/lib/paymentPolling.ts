/**
 * 카카오페이 팝업 결제의 결과를 부모 창에서 폴링해 판정합니다.
 *
 * <p>카카오페이는 결제를 마치면 카카오 도메인으로 리다이렉트하므로 팝업의 URL을
 * 부모가 직접 읽을 수 없습니다(같은 출처가 아닙니다). 그래서 서버에 결제 상태를
 * 주기적으로 물어보는 방식을 씁니다.</p>
 *
 * <p>일반 예매와 취소표 구매가 이 흐름을 각자 갖고 있었습니다. 폴링 주기·타임아웃·
 * 연속 실패 처리·팝업 감시가 모두 같은데 조회할 API와 성공 판정, 이동할 주소만
 * 달랐습니다. 다른 부분만 인자로 받고 나머지는 여기로 모읍니다.</p>
 */

/** 결제 상태 폴링 주기. */
export const PAYMENT_POLL_INTERVAL_MS = 2000;

/**
 * 폴링을 유지할 최대 시간.
 *
 * PG가 응답하지 않거나 사용자가 결제창을 열어둔 채 방치하면 PENDING이 계속 돌아온다.
 * 상한이 없으면 오버레이가 영원히 걸린 채 서버를 계속 때린다. 카카오페이 결제창
 * 자체가 10분 안팎에 만료되므로 그보다 넉넉하게 잡는다.
 */
export const PAYMENT_POLL_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * 폴링 실패를 몇 번까지 견딜지.
 *
 * 일시적 네트워크 오류는 다음 주기에 회복되므로 즉시 중단하면 안 된다. 반대로
 * 서버가 계속 5xx를 내는 상황에서 조용히 재시도만 반복하면 사용자는 아무 안내도
 * 못 받고 갇힌다. 연속 실패만 세고, 한 번이라도 성공하면 0으로 되돌린다.
 */
export const PAYMENT_POLL_MAX_CONSECUTIVE_FAILURES = 5;

/** 한 번 조회한 결제 상태를 어떻게 볼지에 대한 판정 결과. */
export type PaymentPollVerdict =
  | { kind: 'PENDING' }
  | { kind: 'SUCCESS'; successUrl: string }
  | { kind: 'FAILED'; title: string; message: string };

/** 폴링이 끝난 이유. 호출부는 이것만 보고 화면을 정리하면 된다. */
export type PaymentPollOutcome =
  | { kind: 'SUCCESS'; successUrl: string }
  | { kind: 'FAILED'; title: string; message: string }
  | { kind: 'ABORTED' };

export interface PaymentPollOptions {
  /** 감시할 결제 팝업. */
  popup: Window;
  /**
   * 서버에 현재 결제 상태를 물어보고 판정까지 마친다.
   * 조회에 실패하면 throw 한다. 연속 실패 처리는 이쪽에서 한다.
   */
  checkStatus: () => Promise<PaymentPollVerdict>;
  /** 연속 실패 로그에 남길 이름. */
  label: string;
}

const closeQuietly = (popup: Window) => {
  try {
    popup.close();
  } catch {
    /* 이미 닫힌 경우 무시 */
  }
};

/**
 * 결제가 끝날 때까지 폴링하고, 끝난 이유를 돌려줍니다.
 *
 * <p>끝나는 경우는 넷입니다. 결제 성공, 결제 실패·취소, 사용자가 팝업을 닫음,
 * 그리고 상한 시각 초과입니다. 어느 쪽이든 팝업과 타이머를 정리한 뒤 돌아옵니다.</p>
 *
 * <p>팝업이 닫힌 경우에도 한 번 더 상태를 확인합니다. 결제를 마친 직후 사용자가
 * 창을 닫으면 폴링 주기 사이에 끼어 성공을 놓칠 수 있기 때문입니다.</p>
 *
 * @param options 감시할 팝업과 상태 조회 방법
 * @return 폴링이 끝난 이유
 */
export const pollPaymentResult = ({
  popup,
  checkStatus,
  label,
}: PaymentPollOptions): { promise: Promise<PaymentPollOutcome>; cancel: () => void } => {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let settled = false;

  let resolvePromise: (outcome: PaymentPollOutcome) => void;
  const promise = new Promise<PaymentPollOutcome>((resolve) => {
    resolvePromise = resolve;
  });

  // 한 번만 끝난다. 팝업이 닫히는 것과 상태 조회 성공이 같은 주기에 겹칠 수 있다.
  const settle = (outcome: PaymentPollOutcome) => {
    if (settled) return;
    settled = true;
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    closeQuietly(popup);
    resolvePromise(outcome);
  };

  const startedAt = Date.now();
  let consecutiveFailures = 0;

  intervalId = setInterval(async () => {
    if (settled) return;

    if (Date.now() - startedAt > PAYMENT_POLL_TIMEOUT_MS) {
      // 실제로 결제가 됐을 수도 있으므로 "실패"가 아니라 확인 안내를 준다.
      settle({
        kind: 'FAILED',
        title: '결제 확인 지연',
        message: '결제 결과를 확인하지 못했습니다.\n마이페이지에서 예매 내역을 확인해 주세요.',
      });
      return;
    }

    // 사용자가 직접 닫은 경우. 결제를 마치고 닫았을 수 있어 한 번 더 확인한다.
    if (popup.closed) {
      try {
        const verdict = await checkStatus();
        if (verdict.kind === 'SUCCESS') {
          settle({ kind: 'SUCCESS', successUrl: verdict.successUrl });
          return;
        }
      } catch {
        // 확인에 실패하면 그냥 중단으로 본다.
      }
      settle({
        kind: 'FAILED',
        title: '결제 중단',
        message: '결제 창이 닫혔습니다.\n결제를 다시 시도해주세요.',
      });
      return;
    }

    try {
      const verdict = await checkStatus();
      consecutiveFailures = 0;

      if (verdict.kind === 'SUCCESS') {
        settle({ kind: 'SUCCESS', successUrl: verdict.successUrl });
      } else if (verdict.kind === 'FAILED') {
        settle({ kind: 'FAILED', title: verdict.title, message: verdict.message });
      }
      // PENDING이면 계속 폴링한다.
    } catch (e) {
      // 조용히 재시도만 반복하면 서버 장애 시 사용자가 갇히므로
      // 연속 실패가 쌓이면 중단하고 안내한다.
      consecutiveFailures += 1;
      console.error(
        `[Payment] ${label} 결제 상태 조회 실패 (${consecutiveFailures}/${PAYMENT_POLL_MAX_CONSECUTIVE_FAILURES})`,
        e,
      );

      if (consecutiveFailures >= PAYMENT_POLL_MAX_CONSECUTIVE_FAILURES) {
        settle({
          kind: 'FAILED',
          title: '결제 확인 실패',
          message: '결제 상태를 확인할 수 없습니다.\n마이페이지에서 예매 내역을 확인해 주세요.',
        });
      }
    }
  }, PAYMENT_POLL_INTERVAL_MS);

  // 강제 취소 버튼과 언마운트에서 부른다. 팝업도 같이 닫는다.
  return { promise, cancel: () => settle({ kind: 'ABORTED' }) };
};
