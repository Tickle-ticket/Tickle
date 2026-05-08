'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSeatData } from '@/src/features/book/api/useSeatData';
import { seatApi } from '@/src/shared/api/seatApi';
import { bookingApi } from '@/src/shared/api/bookingApi';
import { paymentApi } from '@/src/shared/api/paymentApi';
import { createCancellationWaitCandidates } from '@/src/shared/api/cancellationApi';


import { PriceLegend } from '@/src/shared/components/PriceLegend';
import { InteractiveMapViewer } from '@/src/shared/components/InteractiveMapViewer';
import { Calendar } from '@/src/shared/components/Calendar';
import { useEventDetail } from '@/src/features/book/api/useEventDetail';
import { CustomCAPTCHA } from '@/src/shared/components/CustomCAPTCHA';
import { Seat } from '@/src/shared/components/Seat';
import { SegmentedControl } from '@/src/shared/components/SegmentedControl';
import { Title } from '@/src/shared/components/Title';
import { Accordion } from '@/src/shared/components/Accordion';
import { Toggle } from '@/src/shared/components/Toggle';
import type { SeatColor, SeatStatus, CongestionLevel } from '@/src/shared/components/types';
import { useBookStore } from '../store/useBookStore';
import { Modal } from '@/src/shared/components/Modal';
import { useTrialCollector } from '@/src/shared/tracking/useTrialCollector';
import { useUserProfile } from '@/src/shared/api/useUserProfile';
import { useBookingPreorder } from '../api/useBookingPreorder';
import { TicketTypeStep } from './components/TicketTypeStep';
import { PaymentStep } from './components/PaymentStep';
import { SeatSelectionPanel } from './components/SeatSelectionPanel';
import { SeatMapPanel } from './components/SeatMapPanel';
import { BookingModals } from './components/BookingModals';

interface BookViewProps {
  onClose: () => void;
  eventId?: string;
  mode?: 'BOOK' | 'CANCEL' | 'WAITLIST';
  initialSchedule?: { date: string, time: string, scheduleId?: string };
  initialSeats?: string[];
  initialModifyModeActive?: boolean;
  initialModifyingSchedule?: boolean;
  admitToken?: string;
}

const toBehaviorEventDate = (date?: string | null) => date?.replace(/\./g, '-') ?? null;

export const BookView = ({ onClose, eventId, mode = 'BOOK', initialSchedule, initialSeats = [], initialModifyModeActive = false, initialModifyingSchedule = false, admitToken }: BookViewProps) => {
  const isWaitlistMode = mode === 'WAITLIST';
  const isCancelMode = mode === 'CANCEL';

  const { data: userProfile } = useUserProfile();
  const { data: eventDetail, isLoading: isEventLoading, isError: isEventError } = useEventDetail(eventId); // 이벤트 ID 연동

  const selectedDate = useBookStore(s => s.selectedDate);
  const setSelectedDate = useBookStore(s => s.setSelectedDate);
  const selectedTime = useBookStore(s => s.selectedTime);
  const setSelectedTime = useBookStore(s => s.setSelectedTime);
  const selectedSeats = useBookStore(s => s.selectedSeats);
  const setSelectedSeats = useBookStore(s => s.setSelectedSeats);
  const toggleSeat = useBookStore(s => s.toggleSeat);
  const selectedSeatsToCancel = useBookStore(s => s.selectedSeatsToCancel);
  const setSelectedSeatsToCancel = useBookStore(s => s.setSelectedSeatsToCancel);
  const toggleCancelSeat = useBookStore(s => s.toggleCancelSeat);
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

  const enableWs = !isCancelMode || isModifyModeActive;

  // Clawptcha State
  const [isBotVerified, setIsBotVerified] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isWaitlistCompleteModalOpen, setIsWaitlistCompleteModalOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [errorModalConfig, setErrorModalConfig] = useState<{ isOpen: boolean, title: string, message: string, onConfirm?: () => void, confirmText?: string, showCancelButton?: boolean }>({ isOpen: false, title: '', message: '' });

  const handleCloseErrorModal = () => {
    setErrorModalConfig(prev => ({ ...prev, isOpen: false }));
    if (errorModalConfig.onConfirm) {
      errorModalConfig.onConfirm();
    }
  };

  const { fetchOptions, submitPreorder, isOptionsLoading, isPreorderLoading, optionsData } = useBookingPreorder();

  const bookingStep = useBookStore(s => s.bookingStep);
  const setBookingStep = useBookStore(s => s.setBookingStep);

  // ── Trial Collector (행동 데이터 수집) ──────────────────────
  const { setStage: setTrialStage, setSelectedSeats: setTrialSeats, finalize: finalizeTrial } = useTrialCollector({
    // 인원 선택 버튼을 누르기 전(CAPTCHA, SEAT)까지만 활성화
    enabled: (mode === 'BOOK' || mode === 'WAITLIST') && (!isBotVerified || bookingStep === 'SEAT'),
    userId: userProfile?.userId,
    behaviorEvent: {
      eventId: Number(eventId),
      scheduleId: Number(scheduleId) || undefined,
      eventDate: toBehaviorEventDate(confirmedSchedule?.date),
    },
  });
  const setPriceGradeTicketCounts = useBookStore((s: any) => s.setPriceGradeTicketCounts);

  // 예약 번호 보관용
  const [preorderBookingId, setPreorderBookingId] = useState<number | null>(null);

  const { data: seatAvailability, venueId, isLoading: isSeatsLoading, error: seatError } = useSeatData(
    eventDetail?.eventId || null,
    scheduleId,
    enableWs,
    mode === 'WAITLIST' ? 'WAITLIST' : 'BOOKING',
    admitToken || null
  );

  // 공연장 도면 동적 로딩 (Hook 규칙 준수를 위해 컴포넌트 최상단 렌더 영역에 선언)

  const StageComponent = React.useMemo(() => {
    if (!venueId) return null;
    return React.lazy<React.ComponentType<any>>(() =>
      import(`@/src/shared/components/Stage_${venueId}`)
        .then(module => ({ default: module[`Stage_${venueId}`] }))
        .catch(() => ({
          default: () => (
            <div className="flex items-center justify-center h-full min-h-[600px] text-gray-500 bg-gray-50 dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
              <p className="font-medium text-lg">이 공연장의 도면은 아직 지원되지 않습니다.</p>
            </div>
          )
        }))
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
    if (bookingStep !== 'SEAT' && scheduleId && eventDetail) {
      try {
        if (userProfile?.userId) {
          await seatApi.releaseSeat(eventDetail.eventId, scheduleId);
        }
      } catch (err: any) {
        console.error('Failed to release seats on exit', err);
        if (err.status === 404) {
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
      if (scheduleId && eventDetail && userProfile?.userId) {
        seatApi.releaseSeat(eventDetail.eventId, scheduleId).catch(console.error);
      }
      setErrorModalConfig({
        isOpen: true,
        title: '결제 시간 초과',
        message: '결제 시간이 초과되어 예매가 취소되었습니다.',
        onConfirm: onClose
      });
    }
  }, [timeLeft, bookingStep, isModifyModeActive, scheduleId, eventDetail, userProfile, onClose]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };



  useEffect(() => {
    if (seatError) {
      if (seatError.status === 404) {
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

  if (isEventLoading || !eventDetail) {
    if (isEventError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 gap-4">
          <p className="text-red-500 font-medium">예매 정보를 불러오는데 실패했습니다.</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition">닫기</button>
        </div>
      );
    }
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 gap-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">예매 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  const seatsData: Record<string, { color?: SeatColor; status: SeatStatus; isSelected: boolean; congestion?: CongestionLevel; sessionSeatId?: number; detailedInfo?: string }> = {};

  if (isCancelMode && !isModifyModeActive) {
    // 취소 모드: 초기 좌석만 렌더링하고 나머지는 비활성화
    initialSeats.forEach(seatId => {
      const isSelected = selectedSeatsToCancel.has(seatId);
      seatsData[seatId] = {
        status: 'selectable',
        isSelected: isSelected,
        color: 'vip' as SeatColor, // mock grade color
      };
    });
  } else if (seatAvailability) {
    Object.entries(seatAvailability).forEach(([seatId, info]) => {
      // 내 기존 좌석인 경우 (예약 변경 모드)
      const isMyInitialSeat = initialSeats.includes(seatId);

      const isSelectable = isWaitlistMode ? !info.isAvailable : (info.isAvailable || isMyInitialSeat);
      const status: SeatStatus = isSelectable ? 'selectable' : 'disabled';
      const isSelected = isMyInitialSeat ? selectedSeatsToCancel.has(seatId) : selectedSeats.has(seatId);

      let congestion: 'high' | 'medium' | 'low' | 'none' = 'none';
      if (isWaitlistMode && !info.isAvailable) {
        const hash = seatId.charCodeAt(0) + (parseInt(seatId.slice(1)) || 0);
        if (hash % 3 === 0) congestion = 'high';
        else if (hash % 3 === 1) congestion = 'medium';
        else congestion = 'low';
      }

      if (bookingStep === 'TICKET_TYPE' && !isSelected) {
        seatsData[seatId] = { status: 'disabled' as SeatStatus, isSelected: false, color: 'disabled' as SeatColor, congestion, sessionSeatId: info.sessionSeatId, detailedInfo: info.detailedInfo };
      } else {
        const gradeColor = isMyInitialSeat ? 'vip' : ((!isSelectable && isWaitlistMode) ? 'disabled' : info.priceGrade.toLowerCase());
        const finalColor = (viewMode === 'congestion' && congestion !== 'none') ? congestion : gradeColor;
        seatsData[seatId] = { status, isSelected, color: finalColor as SeatColor, congestion, sessionSeatId: info.sessionSeatId, detailedInfo: info.detailedInfo };
      }
    });
  }

  const getSeatInfo = (seatId: string) => {
    if (initialSeats.includes(seatId)) {
      const match = seatId.match(/^[a-zA-Z]+/);
      let priceGrade = match ? match[0].toUpperCase() : 'VIP';
      if (priceGrade === 'V') priceGrade = 'VIP';
      const price = eventDetail?.zonePrices.find(p => p.priceGrade === priceGrade)?.price || 0;
      return { priceGrade, price };
    }
    const priceGrade = seatAvailability?.[seatId]?.priceGrade || '일반';
    const price = eventDetail?.zonePrices.find(p => p.priceGrade === priceGrade)?.price || 0;
    return { priceGrade, price };
  };

  const getDetailedSeatInfo = (seatId: string) => {
    return seatsData[seatId]?.detailedInfo || seatId;
  };

  const handleSeatClick = async (id: string, e?: React.MouseEvent) => {
    if (e && !e.isTrusted) {
      window.location.href = '/blocked';
      return;
    }

    if (bookingStep === 'TICKET_TYPE') return;

    // 취소 모드이거나 (예약 변경 모드 내의 초기 좌석)
    if ((isCancelMode && !isModifyModeActive) || initialSeats.includes(id)) {
      toggleCancelSeat(id);
      return;
    }

    const seatData = seatsData[id];
    if (!scheduleId || !seatData || seatData.status !== 'selectable' || !seatData.sessionSeatId) return;

    if (seatData.isSelected) {
      toggleSeat(id);
    } else {
      if (selectedSeats.size >= 4) {
        setErrorModalConfig({ isOpen: true, title: '선택 제한', message: '한 번에 최대 4개까지 선택 가능합니다.' });
        return;
      }
      toggleSeat(id);
    }
  };

  const handleNextStep = async () => {
    if (selectedSeats.size === 0) return;

    const userId = userProfile?.userId;
    if (!userId) {
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
      const sessionSeatIds = Array.from(selectedSeats)
        .map(seatId => seatsData[seatId]?.sessionSeatId)
        .filter(Boolean) as number[];

      if (isWaitlistMode) {
        if (!admitToken) {
          throw new Error('대기열 인증 토큰이 유효하지 않습니다.');
        }
        await createCancellationWaitCandidates(eventDetail.eventId, scheduleId!, admitToken, { sessionSeatIds });
        await finalizeTrial();
        setIsWaitlistCompleteModalOpen(true);
      } else {
        if (sessionSeatIds.length > 0) {
          // [Batch Hold] '다음 단계' 진입 시 일괄 검증 및 선점 요청
          await seatApi.holdSeat(eventDetail.eventId, scheduleId!, admitToken || '', { sessionSeatIds });

          // 선점 성공 시 옵션(권종/할인) 데이터 조회
          await fetchOptions(parseInt(eventDetail.eventId, 10), parseInt(scheduleId!, 10), sessionSeatIds);
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

        // 🔥 인원 선택(권종) 단계로 넘어가기 직전에 데이터 수집 완전 종료 및 전송!
        await finalizeTrial();

        setBookingStep('TICKET_TYPE');
      }
    } catch (err: any) {
      if (err.status === 409) {
        setIsConflictModalOpen(true);
      } else if (err.status === 400) {
        setErrorModalConfig({ isOpen: true, title: '요청 오류', message: '잘못된 요청입니다. 입력 정보나 세션 상태를 확인해 주세요. (400)' });
      } else if (err.status === 404) {
        setErrorModalConfig({ isOpen: true, title: '정보 없음', message: '선택하신 공연, 회차 또는 좌석 정보를 찾을 수 없습니다. (404)' });
      } else {
        setErrorModalConfig({ isOpen: true, title: '오류 발생', message: err.message || '좌석 옵션 정보를 불러오는 데 실패했습니다.' });
      }
    } finally {
      setIsHolding(false);
    }
  };

  const SEAT_PRICES = eventDetail.zonePrices || [];

  if (!isBotVerified) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 p-6 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="z-10 animate-fade-in">
          <CustomCAPTCHA
            onSuccess={(token) => {
              console.log('Bot verified!', token);
              setIsBotVerified(true);
            }}
            onClose={handleCloseClick}
          />
        </div>

        <BookingModals
          isExitModalOpen={isExitModalOpen}
          isWaitlistCompleteModalOpen={false}
          isConflictModalOpen={false}
          errorModalConfig={errorModalConfig}
          handleCancelExit={handleCancelExit}
          handleConfirmExit={handleConfirmExit}
          handleCloseWaitlistComplete={() => { }}
          handleCloseConflictModal={() => { }}
          handleCloseErrorModal={() => setErrorModalConfig(prev => ({ ...prev, isOpen: false }))}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-white dark:bg-zinc-950 overflow-hidden animate-fade-in">
      {/* Header */}
      <header className="w-full shrink-0 bg-white dark:bg-zinc-950 p-6 shadow-sm flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={handleCloseClick}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            aria-label="닫기"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <h1 className="text-xl font-bold">{bookingStep === 'PAY_METHOD' ? '결제 수단 선택' : bookingStep === 'PAYMENT' ? '결제 하기' : '좌석 선택'}</h1>
        </div>
        <div className="text-sm font-medium text-gray-500 flex items-center gap-2 bg-gray-50 dark:bg-zinc-800 px-4 py-2 rounded-full border border-gray-200 dark:border-zinc-700">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          예매 가능 시간 <span className="text-red-500 font-extrabold ml-1">{formatTime(timeLeft)}</span>
        </div>
      </header>

      {/* Main Content: Horizontal Split */}
      <div className="flex flex-1 w-full overflow-hidden">

        {/* Left Side: Map Area */}
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
        />

        {/* Right Side: Information & Checkout */}
        <div className="w-[40%] h-full flex flex-col bg-gray-50 dark:bg-zinc-950 relative">
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
              onSubmitPreorder={async (seatIds, optionSelections) => {
                const userId = userProfile?.userId;
                if (!userId) {
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
                  const res = await submitPreorder(
                    parseInt(eventDetail.eventId, 10),
                    parseInt(scheduleId!, 10),
                    seatIds,
                    optionSelections
                  );
                  if (res?.bookingId) {
                    setBookingStep('PAYMENT');
                  }
                } catch (err: any) {
                  if (err.status === 400) {
                    setErrorModalConfig({ isOpen: true, title: '요청 오류', message: '유효하지 않은 권종을 선택했습니다. 권종/할인 선택을 다시 확인해주세요. (400)' });
                  } else if (err.status === 404) {
                    setErrorModalConfig({ isOpen: true, title: '정보 없음', message: '해당 회차나 예매 정보를 찾을 수 없습니다. 다시 시도해주세요. (404)' });
                  } else if (err.status === 409) {
                    setIsConflictModalOpen(true);
                  } else {
                    setErrorModalConfig({ isOpen: true, title: '결제 오류', message: err.message || '결제 처리 중 오류가 발생했습니다.' });
                  }
                }
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
          onCancel={() => {
            setBookingStep('TICKET_TYPE');
          }}
          onConflictError={() => setIsConflictModalOpen(true)}
          onError={(title, message) => setErrorModalConfig({ isOpen: true, title, message })}
        />
      )}



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
        handleCloseErrorModal={() => setErrorModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
