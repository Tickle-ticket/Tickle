'use client';

import React, { useState, useEffect, useRef } from 'react';
import { isFailure, toFailureTag } from '@/src/shared/api/errors';
import { seatApi } from '@/src/shared/api/seatApi';
import { createCancellationWaitCandidates } from '@/src/shared/api/cancellationApi';
import { reservationApi } from '@/src/shared/api/reservationApi';

import { useEventDetailWithFixtures } from '@/src/features/book/api/useEventDetailWithFixtures';
import { useBookStore } from '../store/useBookStore';
import { useTrialCollector } from '@/src/shared/tracking/useTrialCollector';
import { createBookFlowPolicy } from '../api/bookFlowPolicy';
import { useUserProfile } from '@/src/shared/api/useUserProfile';
import { useBookingPreorder } from '../api/useBookingPreorder';
import { useSeatStep } from '../api/useSeatStep';
import { releaseSeatHold, cancelPreorder } from '../api/releaseHold';
import { isBlockedNavigation } from '@/src/shared/utils/blockedNavigation';
import { CaptchaStep } from './components/CaptchaStep';
import { TicketTypeStep } from './components/TicketTypeStep';
import { PaymentStep } from './components/PaymentStep';
import { SeatSelectionPanel } from './components/SeatSelectionPanel';
import { SeatMapPanel } from './components/SeatMapPanel';
import { BookingModals } from './components/BookingModals';
import { useShadowScenario } from '../hooks/useShadowScenario';
import { useTicketingCampaign } from '../hooks/useTicketingCampaign';

interface BookViewProps {
  onClose: () => void;
  eventId?: string;
  mode?: 'BOOK' | 'CANCEL' | 'WAITLIST';
  initialSchedule?: { date: string, time: string, scheduleId?: string };
  initialSeats?: string[];
  initialModifyModeActive?: boolean;
  initialModifyingSchedule?: boolean;
  admitToken?: string;
  onLeaveQueue?: () => void;
  onStepChange?: (step: string) => void;
  onStepBack?: (targetStep: string) => void;
  /** 결제하기 버튼 클릭 시 호출 (SSE 해제 등) */
  onPaymentStart?: () => void;
}

const toBehaviorEventDate = (date?: string | null) => date?.replace(/\./g, '-') ?? null;

export const BookView = ({ onClose, eventId, mode = 'BOOK', initialSchedule, initialSeats = [], initialModifyModeActive = false, initialModifyingSchedule = false, admitToken, onLeaveQueue, onStepChange, onStepBack, onPaymentStart }: BookViewProps) => {
  // Storybook은 MSW 핸들러로 실제 예매 흐름을 그대로 태우므로 예외를 두지 않는다.
  const flowPolicy = createBookFlowPolicy(mode, eventId);
  const { isShadow: isShadowModeActive, isWaitlistMode } = flowPolicy;
  const isCancelMode = mode === 'CANCEL';

  const { data: userProfile } = useUserProfile();
  const { data: eventDetail, isLoading: isEventLoading, isError: isEventError } = useEventDetailWithFixtures(eventId); // 이벤트 ID 연동

  const selectedDate = useBookStore(s => s.selectedDate);
  const setSelectedDate = useBookStore(s => s.setSelectedDate);
  const selectedTime = useBookStore(s => s.selectedTime);
  const setSelectedTime = useBookStore(s => s.setSelectedTime);
  const selectedSeats = useBookStore(s => s.selectedSeats);
  const setSelectedSeats = useBookStore(s => s.setSelectedSeats);
  const selectedSeatsToCancel = useBookStore(s => s.selectedSeatsToCancel);
  const setSelectedSeatsToCancel = useBookStore(s => s.setSelectedSeatsToCancel);
  const isModifyingSchedule = useBookStore(s => s.isModifyingSchedule);
  const setIsModifyingSchedule = useBookStore(s => s.setIsModifyingSchedule);
  const confirmedSchedule = useBookStore(s => s.confirmedSchedule);
  const setConfirmedSchedule = useBookStore(s => s.setConfirmedSchedule);
  const isModifyModeActive = useBookStore(s => s.isModifyModeActive);
  const setIsModifyModeActive = useBookStore(s => s.setIsModifyModeActive);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const scheduleId = confirmedSchedule
    ? confirmedSchedule.scheduleId
    ?? eventDetail?.schedules
      .find(schedule => schedule.date === confirmedSchedule.date)
      ?.times.find(time => time.time === confirmedSchedule.time)
      ?.scheduleId
    ?? `${confirmedSchedule.date}-${confirmedSchedule.time}`
    : null;

  // Clawptcha State
  const isBotVerified = useBookStore(s => s.isBotVerified);
  const setIsBotVerified = useBookStore(s => s.setIsBotVerified);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isWaitlistCompleteModalOpen, setIsWaitlistCompleteModalOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [errorModalConfig, setErrorModalConfig] = useState<{ isOpen: boolean, title: string, message: string, onConfirm?: () => void, confirmText?: string, showCancelButton?: boolean }>({ isOpen: false, title: '', message: '' });
  const [isInvalidAccess, setIsInvalidAccess] = useState(false);

  const handleCloseErrorModal = () => {
    setErrorModalConfig(prev => ({ ...prev, isOpen: false }));
    if (errorModalConfig.onConfirm) {
      errorModalConfig.onConfirm();
    }
  };

  const { fetchOptions, submitPreorder, submitMockPreorder, isOptionsLoading, isPreorderLoading, optionsData, setOptionsData } = useBookingPreorder();

  const bookingStep = useBookStore(s => s.bookingStep);
  const setBookingStep = useBookStore(s => s.setBookingStep);

  // ── Trial Collector (행동 데이터 수집) ──────────────────────
  const { setStage: setTrialStage, setSelectedSeats: setTrialSeats, finalize: finalizeTrial, flush: flushTrial } = useTrialCollector({
    // 인원 선택 버튼을 누르기 전(CAPTCHA, SEAT)까지만 활성화
    enabled: (mode === 'BOOK' || mode === 'WAITLIST') && (!isBotVerified || bookingStep === 'SEAT'),
    userId: userProfile?.userId,
    initialStage: 'captcha',
    behaviorEvent: {
      eventId: Number(eventId),
      scheduleId: Number(scheduleId) || undefined,
      eventDate: toBehaviorEventDate(confirmedSchedule?.date),
    },
  });
  const setPriceGradeTicketCounts = useBookStore((s) => s.setPriceGradeTicketCounts);
  const setPendingOptionSelections = useBookStore((s) => s.setPendingOptionSelections);

  // 예약 번호 보관용
  const [preorderBookingId, setPreorderBookingId] = useState<number | null>(null);
  const preorderBookingIdRef = useRef<number | null>(null);
  useEffect(() => {
    preorderBookingIdRef.current = preorderBookingId;
  }, [preorderBookingId]);

  const {
    venueId, isSeatsLoading, seatError,
    maxSelectable, seatsData, getSeatInfo, getDetailedSeatInfo,
    handleSeatClick: rawHandleSeatClick,
  } = useSeatStep({
    eventDetail,
    userProfile,
    mode,
    admitToken: admitToken || null,
    initialSeats,
    scheduleId,
  });

  // 현재 선점 중인 상태를 ref로 추적하여, 렌더링마다 불필요하게 해제되지 않도록 함
  const isHoldingSeatRef = React.useRef(false);

  useEffect(() => {
    isHoldingSeatRef.current = bookingStep !== 'SEAT' && mode === 'BOOK' && !!eventDetail?.eventId && !!scheduleId;
  }, [bookingStep, mode, eventDetail?.eventId, scheduleId]);

  const {
    interceptWaitlistSubmit,
    interceptSeatHold,
  } = useShadowScenario({
    isShadow: isShadowModeActive,
    seatsData,
    selectedSeats,
    setErrorModalConfig,
    setIsWaitlistCompleteModalOpen,
    setIsConflictModalOpen,
    setIsHolding,
    onClose,
  });

  const {
    interceptPreorder: interceptCampaignPreorder,
    submitButtonText,
    ResultModal,
  } = useTicketingCampaign({
    eventId: eventDetail?.eventId || '',
    submitCampaignEntry: submitMockPreorder,
    isHoldingSeatRef,
    onClose,
    onLeaveQueue,
  });

  // 브라우저 뒤로가기(popstate)로 인한 단계 변경 감지 및 cleanup
  const prevBookingStepRef = useRef(bookingStep);
  useEffect(() => {
    const prevStep = prevBookingStepRef.current;
    prevBookingStepRef.current = bookingStep;

    // 뒤로가기로 인한 단계 역행 감지
    if (prevStep === 'PAY_METHOD' && bookingStep === 'PAYMENT') {
      // 결제 수단 선택에서 약관 동의로 돌아올 때: 별도 cleanup 불필요
      onStepBack?.('payment');
    } else if ((prevStep === 'PAYMENT' || prevStep === 'PAY_METHOD') && (bookingStep === 'TICKET_TYPE' || bookingStep === 'SEAT')) {
      // 결제 단계에서 돌아올 때: 예약 초안 취소
      if (preorderBookingIdRef.current) {
        cancelPreorder(preorderBookingIdRef.current);
        setPreorderBookingId(null);
        preorderBookingIdRef.current = null;
      }
      onStepBack?.(bookingStep === 'SEAT' ? 'book' : 'ticket_type');
    } else if (prevStep === 'TICKET_TYPE' && bookingStep === 'SEAT') {
      // 가격 선택에서 좌석 선택으로 돌아올 때: 좌석 선점 해제
      if (eventDetail?.eventId && scheduleId) {
        releaseSeatHold(eventDetail.eventId, scheduleId);
        isHoldingSeatRef.current = false;
      }
      onStepBack?.('book');
    }
  }, [bookingStep, eventDetail?.eventId, scheduleId, onStepBack]);

  // 이탈 시 선점 좌석 자동 해제 로직
  useEffect(() => {
    /**
     * 선점을 되돌린다.
     *
     * 이 요청이 서버에 닿지 못하면 좌석이 선점 만료 시각까지 잠긴 채로 남아
     * 아무도 살 수 없다. 그래서 실패를 조용히 넘기지 않고, 앱 안에 남아 있는
     * 경우(언마운트)에는 한 번 더 시도한다.
     *
     * @param isPageClosing 탭 닫기·주소 이동처럼 문서가 사라지는 중인지.
     *                      이 경우 일반 fetch는 취소되므로 keepalive 요청을 쓰고,
     *                      재시도할 시간도 없다.
     */
    const releaseHeldSeat = (isPageClosing = false) => {
      // 결제 성공/카카오페이 리다이렉트 등으로 인한 정상적인 이탈인 경우 방지
      const isNormalNavigation = (window as any).__isNavigatingToPayment__ === true;
      if (isNormalNavigation) return;

      const bookingId = preorderBookingIdRef.current;
      const canReleaseSeat =
        isHoldingSeatRef.current && !!eventDetail?.eventId && !!scheduleId;

      if (bookingId) {
        if (isPageClosing) {
          // 문서가 사라지는 중이라 재시도할 시간도, 로그를 남길 곳도 없다.
          // keepalive 요청은 브라우저가 이어서 보낸다.
          void reservationApi.cancelReservationOnExit(bookingId).catch(() => {});
        } else {
          cancelPreorder(bookingId);
        }
        return;
      }

      if (!canReleaseSeat) return;

      if (isPageClosing) {
        void seatApi.releaseSeatOnExit(eventDetail!.eventId, scheduleId!).catch(() => {});
      } else {
        releaseSeatHold(eventDetail!.eventId, scheduleId!);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isNormalNavigation = (window as any).__isNavigatingToPayment__ === true;
      const isForceBlockedNavigation = isBlockedNavigation();
      if (isHoldingSeatRef.current && !isNormalNavigation) {
        releaseHeldSeat(true);
        if (isForceBlockedNavigation) return;
        e.preventDefault();
        e.returnValue = ''; // 표준 브라우저 경고창 표시
      }
    };

    // 모바일 브라우저(특히 iOS Safari)는 탭 전환·앱 종료 때 beforeunload를 쏘지
    // 않는다. pagehide는 그 경우에도 발생하므로 좌석이 잠긴 채 방치되지 않도록
    // 함께 듣는다. 두 이벤트가 모두 발생해도 서버는 이미 해제된 좌석을 다시
    // 해제하는 요청을 멱등하게 처리한다.
    const handlePageHide = () => {
      if (isHoldingSeatRef.current || preorderBookingIdRef.current) {
        releaseHeldSeat(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      // 컴포넌트가 언마운트될 때 (사용자가 브라우저 뒤로가기나 모달 닫기를 눌렀을 때)
      releaseHeldSeat();
    };
  }, [eventDetail?.eventId, scheduleId]);

  // 공연장 도면 동적 로딩 (Hook 규칙 준수를 위해 컴포넌트 최상단 렌더 영역에 선언)

  const StageComponent = React.useMemo(() => {
    if (!venueId) return null;
    return React.lazy<React.ComponentType<any>>(() =>
      import(`../../../shared/components/Stage_${venueId}.tsx`)
        .then(module => ({ default: module[`Stage_${venueId}`] }))
        .catch((err) => {
          console.error("Failed to load stage", venueId, err);
          return {
            default: () => (
              <div className="flex items-center justify-center h-full min-h-[600px] text-content-tertiary bg-surface-subtle rounded-xl border border-line">
                <p className="font-medium text-lg">이 공연장의 도면은 아직 지원되지 않습니다. ({venueId})</p>
              </div>
            )
          };
        })
    );
  }, [venueId]);

  const [viewMode, setViewMode] = useState<'grade' | 'congestion'>('grade');

  const resetStore = useBookStore(s => s.resetStore);

  useEffect(() => {
    resetStore({
      selectedDate: initialSchedule?.date || null,
      selectedTime: initialSchedule?.time || null,
      confirmedSchedule: initialSchedule || null,
      isModifyingSchedule: initialModifyingSchedule || !initialSchedule,
      isModifyModeActive: initialModifyModeActive,
      bookingStep: 'SEAT'
    });
    return () => resetStore();
  }, [initialSchedule, initialModifyingSchedule, initialModifyModeActive, resetStore]);

  // ── Trial: stage 변경 추적 ──────────────────────────────────
  // queue(초기) → captcha(CAPTCHA 표시 시) → booking(CAPTCHA 통과 후 좌석 선택)
  useEffect(() => {
    if (!isBotVerified) {
      setTrialStage('captcha');
    } else if (bookingStep === 'SEAT') {
      setTrialStage('booking');
    }
  }, [isBotVerified, bookingStep, setTrialStage]);

  // ── Trial: 선택 좌석 추적 ──────────────────────────────────
  useEffect(() => {
    setTrialSeats([...selectedSeats]);
  }, [selectedSeats, setTrialSeats]);

  const isScheduleChanged = confirmedSchedule && initialSchedule && (confirmedSchedule.date !== initialSchedule.date || confirmedSchedule.time !== initialSchedule.time);
  const effectiveSeatsToCancel = isScheduleChanged ? new Set(initialSeats) : selectedSeatsToCancel;
  const cartSeats = isModifyModeActive
    ? new Set([...initialSeats.filter(s => !effectiveSeatsToCancel.has(s)), ...selectedSeats])
    : (isCancelMode ? selectedSeatsToCancel : selectedSeats);

  const handleCloseClick = () => {
    setIsExitModalOpen(true);
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
      try {
        if (userProfile?.userId) {
          await seatApi.releaseSeat(eventDetail.eventId, scheduleId);
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

  const handleCancelExit = () => {
    setIsExitModalOpen(false);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && bookingStep !== 'SEAT' && !isModifyModeActive) {
      if (preorderBookingId) {
        cancelPreorder(preorderBookingId);
      } else if (scheduleId && eventDetail && userProfile?.userId) {
        releaseSeatHold(eventDetail.eventId, scheduleId);
      }
      setErrorModalConfig({
        isOpen: true,
        title: '결제 시간 초과',
        message: '결제 시간이 초과되어 예매가 취소되었습니다.',
        onConfirm: () => {
          onLeaveQueue?.();
          onClose();
        }
      });
    }
  }, [timeLeft, bookingStep, isModifyModeActive, scheduleId, eventDetail, userProfile, onClose, preorderBookingId, onLeaveQueue]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (seatError) {
      if (isFailure(seatError, 'NotFoundError')) {
        setErrorModalConfig({
          isOpen: true,
          title: '정보 없음',
          message: '공연 또는 회차 정보를 찾을 수 없습니다.',
          onConfirm: onClose
        });
      } else {
        setErrorModalConfig({
          isOpen: true,
          title: '오류 발생',
          message: '좌석 정보를 불러오는 중 오류가 발생했습니다.',
          onConfirm: onClose
        });
      }
    }
  }, [seatError, onClose]);

  if (isInvalidAccess) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-surface-subtle gap-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-content">잘못된 접근입니다</h1>
          <p className="text-content-tertiary">
            예매 정보가 만료되었거나 비정상적인 접근입니다.
          </p>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="px-6 py-2.5 bg-content text-white rounded-xl font-bold hover:bg-surface-inverse:bg-surface-muted transition-colors"
          >
            홈으로 가기
          </button>
        </div>
      </div>
    );
  }

  if (isEventLoading || !eventDetail) {
    if (isEventError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-surface-subtle gap-4">
          <p className="text-danger font-medium">예매 정보를 불러오는데 실패했습니다.</p>
          <button onClick={onClose} className="px-4 py-2 bg-surface-active rounded hover:bg-surface-active transition">닫기</button>
        </div>
      );
    }
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-surface-subtle gap-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-content-tertiary font-medium">예매 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  // useSeatStep에서 제공하는 handleSeatClick을 래핑하여 에러 모달 표시
  const handleSeatClick = async (id: string, e?: React.MouseEvent) => {
    const result = await rawHandleSeatClick(id, e);
    if (result?.error) {
      setErrorModalConfig({ isOpen: true, title: result.title, message: result.message });
    }
  };

  const handleNextStep = async () => {
    if (selectedSeats.size === 0) return;

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
        await createCancellationWaitCandidates(eventDetail.eventId, scheduleId!, admitToken, { sessionSeatIds });
        setIsWaitlistCompleteModalOpen(true);
      } else {
        if (sessionSeatIds.length > 0 && !flowPolicy.skipsServerCalls) {
          // [Batch Hold] '다음 단계' 진입 시 일괄 검증 및 선점 요청
          await seatApi.holdSeat(eventDetail.eventId, scheduleId!, admitToken || '', { sessionSeatIds });

          // 선점 성공 시 옵션(권종/할인) 데이터 조회
          await fetchOptions(parseInt(eventDetail.eventId, 10), parseInt(scheduleId!, 10), sessionSeatIds);
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

  const SEAT_PRICES = eventDetail.zonePrices || [];

  if (!isBotVerified) {
    return (
      <CaptchaStep
        onSuccess={(token) => {
          setIsBotVerified(true);
          onStepChange?.('seat');
        }}
        onClose={handleCloseClick}
        isExitModalOpen={isExitModalOpen}
        errorModalConfig={errorModalConfig}
        handleCancelExit={handleCancelExit}
        handleConfirmExit={handleConfirmExit}
        handleCloseErrorModal={handleCloseErrorModal}
      />
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-surface overflow-hidden animate-fade-in">
      {/* Header */}
      <header className="w-full shrink-0 bg-surface px-4 py-3 sm:p-6 shadow-sm flex items-center justify-between border-b border-line z-10">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={handleCloseClick}
            className="p-1.5 sm:p-2 hover:bg-surface-muted:bg-surface-inverse rounded-full transition-colors"
            aria-label="닫기"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <h1 className="text-base sm:text-xl font-bold truncate">{bookingStep === 'PAY_METHOD' ? '결제 수단 선택' : bookingStep === 'PAYMENT' ? '결제 하기' : '좌석 선택'}</h1>
        </div>
        <div className="text-xs sm:text-sm font-medium text-content-tertiary flex items-center gap-1.5 sm:gap-2 bg-surface-subtle px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full border border-line">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-danger animate-pulse"></span>
          <span className="hidden sm:inline">예매 가능 시간</span> <span className="text-danger font-extrabold sm:ml-1">{formatTime(timeLeft)}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full overflow-hidden relative">

        {/* Map Area — always present as base layer on desktop; full screen on mobile when schedule confirmed */}
        <div className={`absolute inset-0 lg:relative lg:w-[60%] lg:h-full ${(!confirmedSchedule || isModifyingSchedule) ? 'hidden lg:block' : ''}`}>
          <SeatMapPanel
            scheduleId={scheduleId}
            isModifyingSchedule={isModifyingSchedule}
            isSeatsLoading={isSeatsLoading}
            venueId={venueId}
            StageComponent={StageComponent}
            seatsData={seatsData}
            handleSeatClick={handleSeatClick}
            isWaitlistMode={isWaitlistMode}
            viewMode={viewMode}
            setViewMode={setViewMode}
            seatPrices={SEAT_PRICES}
            maxSelectable={maxSelectable}
            selectedCount={selectedSeats.size}
          />
        </div>

        {/* Right Side Panel */}
        {/* Mobile: when schedule NOT confirmed → full screen schedule picker */}
        {/* Mobile: when schedule confirmed → transparent overlay floating on map */}
        {/* Desktop: always side-by-side panel */}
        <div className={`${(!confirmedSchedule || isModifyingSchedule)
          ? 'relative w-full h-full lg:absolute lg:right-0 lg:top-0 lg:w-[40%] lg:h-full bg-surface-subtle overflow-y-auto'
          : `absolute inset-0 lg:right-0 lg:top-0 lg:left-auto lg:w-[40%] lg:bg-surface-subtle:bg-zinc-950 lg:overflow-y-auto lg:pointer-events-auto ${bookingStep === 'SEAT'
            ? 'pointer-events-none'
            : 'pointer-events-auto bg-surface-subtle overflow-y-auto z-30'
          }`
          } flex flex-col`}>
          {bookingStep === 'SEAT' && (
            <SeatSelectionPanel
              eventDetail={eventDetail}
              confirmedSchedule={confirmedSchedule}
              setConfirmedSchedule={setConfirmedSchedule}
              isModifyingSchedule={isModifyingSchedule}
              setIsModifyingSchedule={setIsModifyingSchedule}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              isCancelMode={isCancelMode}
              isModifyModeActive={isModifyModeActive}
              setIsModifyModeActive={setIsModifyModeActive}
              cartSeats={cartSeats}
              selectedSeats={selectedSeats}
              setSelectedSeats={setSelectedSeats}
              selectedSeatsToCancel={selectedSeatsToCancel}
              setSelectedSeatsToCancel={setSelectedSeatsToCancel}
              initialSeats={initialSeats}
              initialSchedule={initialSchedule}
              isWaitlistMode={isWaitlistMode}
              maxSelectable={maxSelectable}
              getSeatInfo={getSeatInfo}
              getDetailedSeatInfo={getDetailedSeatInfo}
              handleNextStep={handleNextStep}
              onClose={onClose}
              effectiveSeatsToCancel={effectiveSeatsToCancel}
              scheduleId={scheduleId}
              onError={(title, message) => setErrorModalConfig({ isOpen: true, title, message })}
              isSubmitting={isHolding || isOptionsLoading}
            />
          )}

          {/* Ticket Type Selection Step */}
          {bookingStep === 'TICKET_TYPE' && optionsData && (
            <TicketTypeStep
              optionsData={optionsData}
              isSubmitting={isPreorderLoading}
              submitButtonText={submitButtonText}
              onSubmitPreorder={async (seatIds, optionSelections) => {
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

                // 체험 행사 공연이면 예매 초안 대신 참여로 집계한다.
                if (await interceptCampaignPreorder(scheduleId!, seatIds, optionSelections)) {
                  return;
                }

                // 권종 선택 결과를 store에 저장 (결제하기 버튼에서 preorder API 호출 시 사용)
                setPendingOptionSelections({ seatIds, optionSelections });
                setBookingStep('PAYMENT');
                onStepChange?.('payment');
              }}
              onCancel={async () => {
                if (scheduleId) {
                  try {
                    await seatApi.releaseSeat(eventDetail.eventId, scheduleId);
                  } catch (err) {
                    console.error('Failed to release seats', err);
                  }
                }
                setBookingStep('SEAT');
              }}
            />
          )}
        </div>
      </div>

      {/* Payment Step Overlay */}
      {(bookingStep === 'PAYMENT' || bookingStep === 'PAY_METHOD') && optionsData && (
        <PaymentStep
          optionsData={optionsData}
          preorderBookingId={preorderBookingId}
          eventId={eventDetail.eventId}
          scheduleId={scheduleId}
          userId={userProfile?.userId}
          userProfile={userProfile}
          submitPreorder={submitPreorder}
          setPreorderBookingId={setPreorderBookingId}
          onCancel={() => {
            // 약관 동의에서 뒤로가기 → 권종 선택 화면으로 복귀 (선택된 권종은 store에 유지됨)
            setBookingStep('TICKET_TYPE');
          }}
          onConflictError={() => setIsConflictModalOpen(true)}
          onError={(title, message) => setErrorModalConfig({ isOpen: true, title, message })}
          onPaymentComplete={() => onLeaveQueue?.()}
          onStepChange={onStepChange}
          onPaymentStart={onPaymentStart}
        />
      )}



      {ResultModal}
      <BookingModals
        isExitModalOpen={isExitModalOpen}
        isWaitlistCompleteModalOpen={isWaitlistCompleteModalOpen}
        isConflictModalOpen={isConflictModalOpen}
        errorModalConfig={errorModalConfig}
        handleCancelExit={handleCancelExit}
        handleConfirmExit={handleConfirmExit}
        handleCloseWaitlistComplete={() => {
          setIsWaitlistCompleteModalOpen(false);
          onClose(); // DetailView로 복귀
        }}
        handleCloseConflictModal={() => {
          setIsConflictModalOpen(false);
          setSelectedSeats(new Set());
        }}
        handleCloseErrorModal={handleCloseErrorModal}
      />
    </div>
  );
};
