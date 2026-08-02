'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBookStore, type BookingStep } from '@/src/features/book/store/useBookStore';
import { leaveQueue } from '@/src/shared/api/queueApi';
import { isBlockedNavigation } from '@/src/shared/utils/blockedNavigation';
import { isNavigatingToPaymentFlow } from '@/src/features/book/lib/paymentNavigation';

/** 상세 화면에서 예매·취소표 대기가 진행되는 단계. */
export type BookingFlowState =
  | 'NONE'
  | 'QUEUE'
  | 'BOOK'
  | 'WAITLIST_QUEUE'
  | 'WAITLIST_BOOK';

/** 브라우저 히스토리에 심는 단계 이름 → 예매 화면의 단계. */
const HISTORY_STEP_TO_BOOKING_STEP: Record<string, BookingStep> = {
  seat: 'SEAT',
  book: 'SEAT', // book = captcha 통과 후 좌석 선택
  ticket_type: 'TICKET_TYPE',
  payment: 'PAYMENT',
  pay_method: 'PAY_METHOD',
};

/**
 * 상세 화면의 예매 흐름(대기열 → 좌석 선택 → 결제)을 관리합니다.
 *
 * <p>DetailView가 1093줄이었는데, 그중 상당 부분이 이 흐름이었습니다. 상태
 * 세 개와 ref 네 개, effect 세 개가 서로 물려 있어 화면 코드와 섞여 있으면
 * 어느 것이 흐름이고 어느 것이 표시인지 구분되지 않았습니다.</p>
 *
 * <p>특히 "대기열을 떠나고 흐름을 닫는" 처리가 여섯 군데에 복사돼 있었습니다.
 * 한 곳이라도 빠지면 사용자가 나간 뒤에도 대기열에 남아 자리를 차지합니다.
 * {@link exitFlow} 하나로 모읍니다.</p>
 *
 * @param activeEventId 현재 보고 있는 공연 식별자
 * @param onBackAttempt 흐름 도중 뒤로가기를 눌렀을 때(종료 확인 모달을 띄운다)
 */
export const useBookingFlow = ({
  activeEventId,
  onBackAttempt,
}: {
  activeEventId: string | null | undefined;
  onBackAttempt: () => void;
}) => {
  const [flowState, setFlowState] = useState<BookingFlowState>('NONE');
  const [admitToken, setAdmitToken] = useState<string | null>(null);
  const [queueToken, setQueueToken] = useState<string | null>(null);

  const queueTokenRef = useRef<string | null>(null);
  const flowScopeRef = useRef<'BOOKING' | 'CANCELLATION_WAIT'>('BOOKING');
  const currentStepRef = useRef<string>('detail');

  // popstate 리스너는 한 번만 등록하므로 최신 flowState를 클로저로 볼 수 없다.
  const flowStateRef = useRef(flowState);
  useEffect(() => {
    flowStateRef.current = flowState;
  }, [flowState]);

  /**
   * 흐름을 닫고 대기열에서 빠집니다.
   *
   * @param options.notifyServer 서버에 이탈을 알릴지. 대기열 화면이 스스로
   *                             정리한 경우에는 중복 호출을 피하려고 끈다
   */
  const exitFlow = useCallback(
    ({ notifyServer = true }: { notifyServer?: boolean } = {}) => {
      if (notifyServer && queueTokenRef.current && activeEventId) {
        // 실패해도 서버가 대기열 만료로 정리한다. 다만 조용히 넘기면
        // 이탈 API가 계속 깨져도 알 수 없어 로그는 남긴다.
        leaveQueue(activeEventId, queueTokenRef.current, flowScopeRef.current).catch((err) =>
          console.warn('[Queue] 대기열 이탈 요청 실패', err),
        );
      }

      queueTokenRef.current = null;
      setQueueToken(null);
      currentStepRef.current = 'detail';
      setFlowState('NONE');
    },
    [activeEventId],
  );

  /** 대기열에 진입한다. 뒤로가기를 감지하려고 히스토리 엔트리를 심는다. */
  const startFlow = useCallback((state: 'QUEUE' | 'WAITLIST_QUEUE') => {
    flowScopeRef.current = state === 'WAITLIST_QUEUE' ? 'CANCELLATION_WAIT' : 'BOOKING';
    setFlowState(state);

    currentStepRef.current = 'queue';
    window.history.pushState({ tickleStep: 'queue' }, '');
  }, []);

  /** 대기열을 통과했다. 되돌아갈 수 없으므로 queue 엔트리를 book으로 교체한다. */
  const handleQueueAdmitted = useCallback((token: string, qToken?: string) => {
    setAdmitToken(token);
    if (qToken) {
      setQueueToken(qToken);
      queueTokenRef.current = qToken;
    }
    currentStepRef.current = 'book';
    window.history.replaceState({ tickleStep: 'book' }, '');
    setFlowState((prev) => (prev === 'QUEUE' ? 'BOOK' : 'WAITLIST_BOOK'));
  }, []);

  /** 대기열 화면이 토큰을 새로 받았을 때. */
  const updateQueueToken = useCallback((token: string | null) => {
    queueTokenRef.current = token;
    setQueueToken(token);
  }, []);

  /**
   * 대기열에서만 빠지고 화면은 그대로 둡니다.
   *
   * <p>결제 성공 직후에 씁니다. 이때는 결제 완료 페이지로 넘어가는 중이라
   * 오버레이를 닫으면 화면이 깜빡입니다.</p>
   */
  const leaveQueueOnly = useCallback(() => {
    if (!queueTokenRef.current || !activeEventId) return;

    leaveQueue(activeEventId, queueTokenRef.current, flowScopeRef.current).catch((err) =>
      console.warn('[Queue] 대기열 이탈 요청 실패', err),
    );
    queueTokenRef.current = null;
    setQueueToken(null);
  }, [activeEventId]);

  /** 예매 화면이 다음 단계로 갈 때 히스토리에 남긴다. */
  const handleBookStepChange = useCallback((step: string) => {
    currentStepRef.current = step;
    window.history.pushState({ tickleStep: step }, '');
  }, []);

  /** 예매 화면 안에서 뒤로 갈 때. */
  const handleBookStepBack = useCallback((targetStep: string) => {
    currentStepRef.current = targetStep;
  }, []);

  // 흐름 도중 탭을 닫거나 뒤로가기를 누르는 경우를 다룬다.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (queueTokenRef.current && activeEventId) {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
        const scope = flowScopeRef.current;
        const url = `${baseUrl}/api/v1/queues/${activeEventId}/leave?queueToken=${queueTokenRef.current}&scope=${scope}`;
        navigator.sendBeacon(url);
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      // 플로우가 활성 상태일 때만 처리
      if (flowStateRef.current === 'NONE') return;

      const targetStep = e.state?.tickleStep || null;

      if (!targetStep) {
        // targetStep이 없으면 detail로 돌아가는 상황 → 경고 모달 표시
        // 뒤로가기를 막기 위해 히스토리 상태를 다시 추가
        window.history.pushState({ tickleStep: currentStepRef.current }, '');
        onBackAttempt();
        return;
      }

      // 플로우 내 이전 단계로 이동
      currentStepRef.current = targetStep;
      const bookingStep = HISTORY_STEP_TO_BOOKING_STEP[targetStep];
      if (bookingStep) {
        useBookStore.getState().setBookingStep(bookingStep);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeEventId, onBackAttempt]);

  // 예매 진행 중에는 새로고침·탭 닫기를 막는다. 결제 이동과 차단 페이지 이동은 예외다.
  useEffect(() => {
    if (flowState === 'NONE') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isBlockedNavigation()) return;
      if (isNavigatingToPaymentFlow()) return;
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [flowState]);

  return {
    flowState,
    admitToken,
    queueToken,
    startFlow,
    exitFlow,
    leaveQueueOnly,
    handleQueueAdmitted,
    updateQueueToken,
    handleBookStepChange,
    handleBookStepBack,
  };
};
