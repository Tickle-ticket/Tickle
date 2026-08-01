'use client';

import { seatApi } from '@/src/shared/api/seatApi';
import { reservationApi } from '@/src/shared/api/reservationApi';
import { createCancellationWaitCandidates } from '@/src/shared/api/cancellationApi';
import { isFailure, toFailureTag } from '@/src/shared/api/errors';
import type { BookFlowPolicy } from '@/src/features/book/api/bookFlowPolicy';

type ErrorModalConfig = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
  showCancelButton?: boolean;
};

/**
 * 좌석을 확정하고 다음 단계로 넘어가는 흐름을 다룹니다.
 *
 * <p>버튼 한 번에 여러 일이 순서대로 일어납니다. 행동 데이터 전송 → 좌석 일괄
 * 선점 → 권종 조회 → 단계 전환입니다. 중간에 실패하면 어디까지 진행됐는지에
 * 따라 안내가 달라야 해서, 오류를 태그로 구분합니다.</p>
 *
 * <p>이탈 처리도 함께 둡니다. 나가기를 확정하면 예약 초안이 있으면 취소하고,
 * 없으면 좌석 선점만 푸는데 이 판단이 좌석 확정과 짝을 이룹니다.</p>
 */
export const useBookingSubmit = ({
  eventDetail,
  scheduleId,
  userProfile,
  flowPolicy,
  admitToken,
  isWaitlistMode,
  bookingStep,
  selectedSeats,
  seatsData,
  getSeatInfo,
  preorderBookingId,
  preorderBookingIdRef,
  isHoldingSeatRef,
  fetchOptions,
  flushTrial,
  interceptWaitlistSubmit,
  interceptSeatHold,
  setPriceGradeTicketCounts,
  setBookingStep,
  setIsHolding,
  setIsConflictModalOpen,
  setIsWaitlistCompleteModalOpen,
  setIsExitModalOpen,
  setErrorModalConfig,
  onStepChange,
  onClose,
  onLeaveQueue,
}: {
  eventDetail: { eventId: string } | undefined;
  scheduleId: string | null;
  userProfile: { userId?: number } | null | undefined;
  flowPolicy: BookFlowPolicy;
  admitToken?: string;
  isWaitlistMode: boolean;
  bookingStep: string;
  selectedSeats: Set<string>;
  seatsData: Record<string, { sessionSeatId?: number }>;
  getSeatInfo: (seatId: string) => { priceGrade: string };
  preorderBookingId: number | null;
  preorderBookingIdRef: React.RefObject<number | null>;
  isHoldingSeatRef: React.RefObject<boolean>;
  fetchOptions: (eventId: number, scheduleId: number, sessionSeatIds: number[]) => Promise<unknown>;
  flushTrial: () => Promise<unknown>;
  interceptWaitlistSubmit: () => Promise<boolean>;
  interceptSeatHold: () => Promise<boolean>;
  setPriceGradeTicketCounts: (next: Record<string, Record<string, number>>) => void;
  setBookingStep: (step: 'SEAT' | 'TICKET_TYPE' | 'PAYMENT' | 'PAY_METHOD') => void;
  setIsHolding: (next: boolean) => void;
  setIsConflictModalOpen: (next: boolean) => void;
  setIsWaitlistCompleteModalOpen: (next: boolean) => void;
  setIsExitModalOpen: (next: boolean) => void;
  setErrorModalConfig: (next: ErrorModalConfig) => void;
  onStepChange?: (step: string) => void;
  onClose: () => void;
  onLeaveQueue?: () => void;
}) => {
const handleNextStep = async () => {
  if (selectedSeats.size === 0) return;
  // 호출부는 상세 조회가 끝난 뒤에만 이 버튼을 그리지만, 훅은 그 순서를
  // 보장받지 못하므로 직접 확인한다.
  if (!eventDetail) return;
  const { eventId } = eventDetail;

  const userId = userProfile?.userId;
  if (flowPolicy.requiresLogin && !userId) {
    setErrorModalConfig({
      isOpen: true,
      title: '로그인 필요',
      message: '로그인이 필요한 서비스입니다.',
      confirmText: '로그인 하기',
      showCancelButton: true,
      onConfirm: () => { window.location.href = '/login'; }
    });
    return;
  }

  try {
    setIsHolding(true);

    // 🔥 인원 선택/대기 버튼을 누르면 무조건 booking event를 전송합니다.
    // flushTrial은 finalizeTrial과 달리 반복 호출이 가능하여,
    // 선점 실패(409) 후 재시도 시에도 매번 새 booking event를 전송합니다.
    await flushTrial();

    const sessionSeatIds = Array.from(selectedSeats)
      .map(seatId => seatsData[seatId]?.sessionSeatId)
      .filter(Boolean) as number[];

    if (isWaitlistMode) {
      if (await interceptWaitlistSubmit()) return;

      if (!admitToken) {
        throw new Error('대기열 인증 토큰이 유효하지 않습니다.');
      }
      await createCancellationWaitCandidates(eventId, scheduleId!, admitToken, { sessionSeatIds });
      setIsWaitlistCompleteModalOpen(true);
    } else {
      if (sessionSeatIds.length > 0 && !flowPolicy.skipsServerCalls) {
        // [Batch Hold] '다음 단계' 진입 시 일괄 검증 및 선점 요청
        await seatApi.holdSeat(eventId, scheduleId!, admitToken || '', { sessionSeatIds });

        // 선점 성공 시 옵션(권종/할인) 데이터 조회
        await fetchOptions(parseInt(eventId, 10), parseInt(scheduleId!, 10), sessionSeatIds);
      } else if (sessionSeatIds.length > 0 && flowPolicy.skipsServerCalls) {
        if (await interceptSeatHold()) return;
      }

      const gradeCounts: Record<string, number> = {};
      Array.from(selectedSeats).forEach(seatId => {
        const { priceGrade } = getSeatInfo(seatId);
        gradeCounts[priceGrade] = (gradeCounts[priceGrade] || 0) + 1;
      });
      const initial: Record<string, Record<string, number>> = {};
      Object.entries(gradeCounts).forEach(([priceGrade]) => {
        initial[priceGrade] = {};
      });
      setPriceGradeTicketCounts(initial);

      setBookingStep('TICKET_TYPE');
      onStepChange?.('ticket_type');
    }
  } catch (err) {
    switch (toFailureTag(err)) {
      case 'ConflictError':
        // 남이 먼저 잡은 좌석. 다른 자리를 고르도록 안내한다.
        setIsConflictModalOpen(true);
        break;
      case 'ValidationError':
        setErrorModalConfig({ isOpen: true, title: '요청 오류', message: '잘못된 요청입니다. 입력 정보나 세션 상태를 확인해 주세요.' });
        break;
      case 'NotFoundError':
        setErrorModalConfig({ isOpen: true, title: '정보 없음', message: '선택하신 공연, 회차 또는 좌석 정보를 찾을 수 없습니다.' });
        break;
      default:
        setErrorModalConfig({
          isOpen: true,
          title: '오류 발생',
          message: err instanceof Error ? err.message : '좌석 옵션 정보를 불러오는 데 실패했습니다.',
        });
    }
  } finally {
    setIsHolding(false);
  }
};

const handleConfirmExit = async () => {
  setIsExitModalOpen(false);
  let hasError = false;

  // 결제 단계 등에서 예약 초안(DRAFT)이 이미 생성된 경우
  if (preorderBookingId) {
    try {
      await reservationApi.cancelReservation(preorderBookingId);
      preorderBookingIdRef.current = null; // unmount 시 중복 호출 방지
    } catch (err) {
      console.error('Failed to cancel draft reservation on exit', err);
    }
  }
  // 예약 초안 생성 전 좌석 선점만 된 경우
  else if (bookingStep !== 'SEAT' && scheduleId && eventDetail) {
    const { eventId } = eventDetail;
    try {
      if (userProfile?.userId) {
        await seatApi.releaseSeat(eventId, scheduleId);
        isHoldingSeatRef.current = false; // unmount 시 중복 호출 방지
      }
    } catch (err) {
      console.error('Failed to release seats on exit', err);
      if (isFailure(err, 'NotFoundError')) {
        setErrorModalConfig({
          isOpen: true,
          title: '정보 없음',
          message: '공연 또는 회차 정보를 찾을 수 없어 좌석 선점 해제에 실패했습니다.',
          onConfirm: onClose
        });
        hasError = true;
      }
    }
  }

  if (!hasError) {
    onLeaveQueue?.();
    onClose();
  }
};

  return { handleNextStep, handleConfirmExit };
};
