'use client';

import React, { useState, useEffect, useRef } from 'react';
import { isFailure } from '@/src/shared/api/errors';
import { seatApi } from '@/src/shared/api/seatApi';
import type { StageComponentProps } from '@/src/shared/components/types';

import { useEventDetailWithFixtures } from '@/src/features/book/api/useEventDetailWithFixtures';
import { useBookStore } from '../store/useBookStore';
import { useTrialCollector } from '@/src/shared/tracking/useTrialCollector';
import { createBookFlowPolicy } from '../api/bookFlowPolicy';
import { formatTime, useBookingTimer } from '@/src/features/book/hooks/useBookingTimer';
import { useUserProfile } from '@/src/shared/api/useUserProfile';
import { useBookingPreorder } from '../api/useBookingPreorder';
import { useSeatStep } from '../api/useSeatStep';
import { useSeatHoldRelease } from '@/src/features/book/hooks/useSeatHoldRelease';
import { useBookingSubmit } from '@/src/features/book/hooks/useBookingSubmit';
import { releaseSeatHold, cancelPreorder } from '../api/releaseHold';
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

  const {
    preorderBookingIdRef,
    isHoldingSeatRef,
    cancelDraftIfAny,
    releaseSeatsIfHeld,
  } = useSeatHoldRelease({
    eventId: eventDetail?.eventId,
    scheduleId,
    preorderBookingId,
    isHoldingSeat: bookingStep !== 'SEAT' && mode === 'BOOK' && !!eventDetail?.eventId && !!scheduleId,
  });


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

  const { handleNextStep, handleConfirmExit } = useBookingSubmit({
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
      if (cancelDraftIfAny()) {
        setPreorderBookingId(null);
      }
      onStepBack?.(bookingStep === 'SEAT' ? 'book' : 'ticket_type');
    } else if (prevStep === 'TICKET_TYPE' && bookingStep === 'SEAT') {
      // 가격 선택에서 좌석 선택으로 돌아올 때: 좌석 선점 해제
      releaseSeatsIfHeld();
      onStepBack?.('book');
    }
  }, [bookingStep, eventDetail?.eventId, scheduleId, onStepBack]);

  // 이탈 시 선점 좌석 자동 해제 로직
  // 공연장 도면 동적 로딩 (Hook 규칙 준수를 위해 컴포넌트 최상단 렌더 영역에 선언)

  const StageComponent = React.useMemo(() => {
    if (!venueId) return null;
    return React.lazy<React.ComponentType<StageComponentProps>>(() =>
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

  const handleCancelExit = () => {
    setIsExitModalOpen(false);
  };

  const { timeLeft } = useBookingTimer({
    isActive: bookingStep !== 'SEAT' && !isModifyModeActive,
    onExpire: () => {
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
        },
      });
    },
  });

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
