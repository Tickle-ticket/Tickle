'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSeatData } from '@/src/features/book/api/useSeatData';
import { seatApi } from '@/src/shared/api/seatApi';
import { fetchVenues } from '@/src/shared/api/venueApi';

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

interface BookViewProps {
  onClose: () => void;
  eventId?: string;
  mode?: 'BOOK' | 'CANCEL' | 'WAITLIST';
  initialSchedule?: { date: string, time: string };
  initialSeats?: string[];
  initialModifyModeActive?: boolean;
  initialModifyingSchedule?: boolean;
}

export const BookView = ({ onClose, eventId = '1', mode = 'BOOK', initialSchedule, initialSeats = [], initialModifyModeActive = false, initialModifyingSchedule = false }: BookViewProps) => {
  const isWaitlistMode = mode === 'WAITLIST';
  const isCancelMode = mode === 'CANCEL';

  const { data: eventDetail, isLoading: isEventLoading } = useEventDetail(eventId); // 이벤트 ID 연동

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

  const enableWs = !isCancelMode || isModifyModeActive;

  // Clawptcha State
  const [isBotVerified, setIsBotVerified] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isWaitlistCompleteModalOpen, setIsWaitlistCompleteModalOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  // ── Trial Collector (행동 데이터 수집) ──────────────────────
  const { setStage: setTrialStage, setSelectedSeats: setTrialSeats, finalize: finalizeTrial } = useTrialCollector({ enabled: mode === 'BOOK' || mode === 'WAITLIST' });

  // Ticket type selection
  const bookingStep = useBookStore(s => s.bookingStep);
  const setBookingStep = useBookStore(s => s.setBookingStep);
  const [ticketTypes, setTicketTypes] = useState<{ id: string, label: string, discount: number }[]>([]);
  // gradeTicketCounts: { 'R': { 'adult': 2, 'child': 1 }, 'S': { 'adult': 1 } }
  const gradeTicketCounts = useBookStore(s => s.gradeTicketCounts);
  const setGradeTicketCounts = useBookStore(s => s.setGradeTicketCounts);
  const [openGrade, setOpenGrade] = useState<string | null>(null);

  // 공연장 목록 (API 연동)
  const [venues, setVenues] = useState<any[]>([]);

  useEffect(() => {
    fetchVenues()
      .then(res => {
        if (res.data && res.data.venues) {
          setVenues(res.data.venues);
        }
      })
      .catch(() => console.error('Failed to fetch venues'));
  }, []);

  // Payment state
  const buyerName = useBookStore(s => s.buyerName);
  const setBuyerName = useBookStore(s => s.setBuyerName);
  const buyerEmail = useBookStore(s => s.buyerEmail);
  const setBuyerEmail = useBookStore(s => s.setBuyerEmail);
  const buyerPhone = useBookStore(s => s.buyerPhone);
  const setBuyerPhone = useBookStore(s => s.setBuyerPhone);
  const agreeAll = useBookStore(s => s.agreeAll);
  const setAgreeAll = useBookStore(s => s.setAgreeAll);
  const agreeTerm1 = useBookStore(s => s.agreeTerm1);
  const setAgreeTerm1 = useBookStore(s => s.setAgreeTerm1);
  const agreeTerm2 = useBookStore(s => s.agreeTerm2);
  const setAgreeTerm2 = useBookStore(s => s.setAgreeTerm2);

  const { data: userProfile } = useUserProfile();
  const isProfileLoaded = useRef(false);

  useEffect(() => {
    // 예매자 정보 입력 단계(PAYMENT) 진입 시 초기 1회만 유저 정보를 세팅합니다. (resetStore와의 충돌 방지)
    if ((bookingStep === 'PAYMENT' || bookingStep === 'PAY_METHOD') && userProfile && !isProfileLoaded.current) {
      setBuyerName(userProfile.realName || userProfile.name || '');
      setBuyerEmail(userProfile.email || '');
      setBuyerPhone(userProfile.phoneNumber || '');
      isProfileLoaded.current = true;
    }
  }, [bookingStep, userProfile, setBuyerName, setBuyerEmail, setBuyerPhone]);
  const [termExpand1, setTermExpand1] = useState(false);
  const [termExpand2, setTermExpand2] = useState(false);

  const [viewMode, setViewMode] = useState<'grade' | 'congestion'>('grade');

  // Pay method selection
  const payCategory = useBookStore(s => s.payCategory);
  const setPayCategory = useBookStore(s => s.setPayCategory);
  const selectedPayMethod = useBookStore(s => s.selectedPayMethod);
  const setSelectedPayMethod = useBookStore(s => s.setSelectedPayMethod);


  const resetStore = useBookStore(s => s.resetStore);

  // 공연장 도면 동적 로딩 (Hook 규칙 준수를 위해 컴포넌트 최상단 렌더 영역에 선언)
  const currentVenue = venues.find(v => v.venueName === eventDetail?.venue);
  const venueId = currentVenue?.venueId;

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
    } else {
      if (bookingStep === 'SEAT') setTrialStage('booking');
      else if (bookingStep === 'TICKET_TYPE') setTrialStage('ticket_type');
      else if (bookingStep === 'PAYMENT' || bookingStep === 'PAY_METHOD') setTrialStage('payment');
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
    if (bookingStep !== 'SEAT' && scheduleId && eventDetail) {
      try {
        await seatApi.releaseSeat(eventDetail.eventId, scheduleId, '1');
      } catch (err) {
        console.error('Failed to release seats on exit', err);
      }
    }
    onClose();
  };

  const handleCancelExit = () => {
    setIsExitModalOpen(false);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const scheduleId = confirmedSchedule ? `${confirmedSchedule.date}-${confirmedSchedule.time}` : null;
  const { data: seatAvailability, isLoading: isSeatsLoading } = useSeatData(eventDetail?.eventId || null, scheduleId, enableWs);

  if (isEventLoading || !eventDetail) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 gap-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">예매 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  const seatsData: Record<string, { color?: SeatColor; status: SeatStatus; isSelected: boolean; congestion?: CongestionLevel; sessionSeatId?: number }> = {};

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
        seatsData[seatId] = { status: 'disabled' as SeatStatus, isSelected: false, color: 'disabled' as SeatColor, congestion, sessionSeatId: info.sessionSeatId };
      } else {
        const gradeColor = isMyInitialSeat ? 'vip' : ((!isSelectable && isWaitlistMode) ? 'disabled' : info.grade.toLowerCase());
        const finalColor = (viewMode === 'congestion' && congestion !== 'none') ? congestion : gradeColor;
        seatsData[seatId] = { status, isSelected, color: finalColor as SeatColor, congestion, sessionSeatId: info.sessionSeatId };
      }
    });
  }

  const getSeatInfo = (seatId: string) => {
    if (initialSeats.includes(seatId)) {
      const match = seatId.match(/^[a-zA-Z]+/);
      let grade = match ? match[0].toUpperCase() : 'VIP';
      if (grade === 'V') grade = 'VIP';
      const price = eventDetail?.zonePrices.find(p => p.grade === grade)?.price || 0;
      return { grade, price };
    }
    const grade = seatAvailability?.[seatId]?.grade || '일반';
    const price = eventDetail?.zonePrices.find(p => p.grade === grade)?.price || 0;
    return { grade, price };
  };

  const getDetailedSeatInfo = (seatId: string) => {
    const match = seatId.match(/([a-zA-Z]+)(\d+)/);
    if (!match) return seatId;
    const num = parseInt(match[2], 10) || 1;

    const floor = num > 50 ? 2 : 1;
    const zones = ['A', 'B', 'C', 'D', 'E'];
    const zone = zones[(num - 1) % 5];
    const row = Math.ceil(num / 15) + (floor === 1 ? 5 : 1);
    const seatNum = num;

    return `${floor}층 ${zone}구역 ${row}열 ${seatNum}번`;
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
        alert('한 번에 최대 4개까지 선택 가능합니다.');
        return;
      }
      toggleSeat(id);
    }
  };

  const handleNextStep = async () => {
    if (selectedSeats.size === 0) return;

    // TODO: get actual userId from auth store. using '1' for now.
    const userId = '1';

    try {
      const sessionSeatIds = Array.from(selectedSeats)
        .map(seatId => seatsData[seatId]?.sessionSeatId)
        .filter(Boolean) as number[];

      if (sessionSeatIds.length > 0) {
        // [Batch Hold] '다음 단계' 진입 시 일괄 검증 및 선점 요청
        await seatApi.holdSeat(eventDetail.eventId, scheduleId!, userId, { sessionSeatIds });
      }

      if (isWaitlistMode) {
        await finalizeTrial();
        setIsWaitlistCompleteModalOpen(true);
      } else {
        const gradeCounts: Record<string, number> = {};
        Array.from(selectedSeats).forEach(seatId => {
          const { grade } = getSeatInfo(seatId);
          gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
        });
        const initial: Record<string, Record<string, number>> = {};
        Object.entries(gradeCounts).forEach(([grade]) => {
          initial[grade] = {};
        });
        setGradeTicketCounts(initial);
        setBookingStep('TICKET_TYPE');
      }
    } catch (err: any) {
      // 선점 실패 (이미 선택된 좌석) 시 모달 오픈
      setIsConflictModalOpen(true);
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

        <Modal
          isOpen={isExitModalOpen}
          onClose={handleCancelExit}
          title="대기열 퇴장"
          description="대기열에서 퇴장하시겠습니까? 다시 진입 시 대기 순서가 초기화됩니다."
          confirmText="퇴장하기"
          cancelText="계속 대기"
          onConfirm={handleConfirmExit}
          onCancel={handleCancelExit}
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
        <div className="w-[60%] h-full bg-gray-100 dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 shadow-inner relative group/map overflow-hidden">

          {/* Overlay when schedule is not selected or modifying */}
          {(!scheduleId || isModifyingSchedule) && (
            <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center animate-fade-in pointer-events-auto">
              <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-700 flex flex-col items-center gap-4 max-w-[80%] text-center transform -translate-y-4">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-500">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">
                    {scheduleId ? '일시를 변경 중입니다' : '관람 일시를 먼저 선택해주세요'}
                  </p>
                  <p className="text-sm text-gray-500">
                    오른쪽 패널에서 원하시는 날짜와 회차를 선택하시면<br />좌석 예매가 활성화됩니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Overlay when seats are loading */}
          {scheduleId && isSeatsLoading && (
            <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-sm z-30 flex flex-col items-center justify-center animate-fade-in">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-blue-600 font-bold mt-4 bg-white/80 dark:bg-zinc-800/80 px-4 py-2 rounded-full shadow-sm">실시간 좌석 정보 불러오는 중...</p>
            </div>
          )}

          <InteractiveMapViewer showZoomControls={true}>
            {(() => {
              if (!venueId || !StageComponent) {
                return (
                  <div className="flex items-center justify-center h-full min-h-[600px] text-gray-500 bg-gray-50 dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
                    <p className="font-medium text-lg">공연장 정보를 불러오는 중입니다...</p>
                  </div>
                );
              }

              return (
                <React.Suspense fallback={
                  <div className="flex items-center justify-center h-full min-h-[400px]">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                }>
                  <StageComponent
                    seatsData={seatsData}
                    onSeatClick={handleSeatClick}
                  />
                </React.Suspense>
              );
            })()}
          </InteractiveMapViewer>

          {isWaitlistMode && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-3 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-gray-200 dark:border-zinc-700">
              <span
                className="text-sm font-extrabold text-gray-800 dark:text-gray-200 cursor-pointer select-none"
                onClick={() => setViewMode(viewMode === 'grade' ? 'congestion' : 'grade')}
              >
                혼잡도 보기
              </span>
              <Toggle
                checked={viewMode === 'congestion'}
                onChange={(checked) => setViewMode(checked ? 'congestion' : 'grade')}
                size="medium"
              />
            </div>
          )}

          <PriceLegend prices={SEAT_PRICES} viewMode={viewMode} />
        </div>

        {/* Right Side: Information & Checkout */}
        <div className="w-[40%] h-full flex flex-col bg-gray-50 dark:bg-zinc-950 relative">
          {(!confirmedSchedule || isModifyingSchedule) ? (
            // Phase 1: Schedule Selection
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 relative">
              {confirmedSchedule && isModifyingSchedule && (
                <button
                  onClick={() => {
                    setIsModifyingSchedule(false);
                    setSelectedDate(confirmedSchedule.date);
                    setSelectedTime(confirmedSchedule.time);
                  }}
                  className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
                  aria-label="변경 취소"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}

              <div className="flex flex-col pr-12">
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">관람 일시 선택</h2>
              </div>

              {/* Date Selection */}
              <div className="flex flex-col gap-2">
                <h3 className="text-[15px] font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[11px] font-bold">1</span>
                  날짜 선택
                </h3>
                <div className="flex justify-center w-full">
                  <div className="w-full flex justify-center scale-[0.93] origin-top -mb-[25px]">
                    <Calendar
                      enabledDates={eventDetail.schedules.map(s => s.date.replace(/\./g, '-'))}
                      selectedDate={selectedDate ? selectedDate.replace(/\./g, '-') : null}
                      onSelect={(date: Date, e?: React.MouseEvent) => {
                        if (e && !e.isTrusted) {
                          window.location.href = '/blocked';
                          return;
                        }
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setSelectedDate(`${year}.${month}.${day}`);
                        setSelectedTime(null);
                      }}
                      className="w-full max-w-[340px] shadow-sm border border-gray-100 dark:border-zinc-800"
                    />
                  </div>
                </div>
              </div>

              {/* Time Selection */}
              <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-zinc-800 pt-4 pb-4 z-10">
                <h3 className="text-[15px] font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[11px] font-bold">2</span>
                  회차 선택
                </h3>
                {selectedDate ? (
                  <div className="flex flex-wrap gap-2 animate-fade-in">
                    {eventDetail.schedules.find(s => s.date === selectedDate)?.times.map((timeObj, idx) => (
                      <button
                        key={timeObj.time}
                        onClick={() => {
                          const newTime = timeObj.time;

                          // 이전에 확정된 스케줄이 있고, 그 스케줄과 다른 일시를 선택했다면
                          if (confirmedSchedule && (confirmedSchedule.date !== selectedDate || confirmedSchedule.time !== newTime)) {
                            // 예약 변경 모드가 아닌 신규 예매일 때만 좌석을 초기화합니다.
                            if (!isModifyModeActive) {
                              setSelectedSeats(new Set());
                            }
                          }

                          setSelectedTime(newTime);
                          setConfirmedSchedule({ date: selectedDate!, time: newTime });
                          setIsModifyingSchedule(false);
                        }}
                        className={`w-[calc(50%-4px)] min-w-[125px] px-3 py-2.5 rounded-xl border-2 font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 ${selectedTime === timeObj.time
                          ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20 transform scale-[1.02]'
                          : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-zinc-700'
                          }`}
                      >
                        <span className="text-[14px]">{idx + 1}회차 - {timeObj.time}</span>
                        <div className="flex flex-wrap gap-1.5 justify-center mt-0.5">
                          {timeObj.remainingSeats.map(seat => {
                            const gradeColors: Record<string, string> = {
                              'VIP': 'grade-badge-vip',
                              'R': 'grade-badge-r',
                              'S': 'grade-badge-s',
                              'A': 'grade-badge-a',
                            };
                            const defaultColor = 'bg-gray-50 text-gray-600 border-gray-200';

                            return (
                              <span
                                key={seat.grade}
                                className={`flex items-center gap-0.5 px-1 py-[1px] rounded-[4px] text-[10px] border ${gradeColors[seat.grade] || defaultColor}`}
                              >
                                <span className="font-extrabold">{seat.grade}</span>
                                <span>{seat.count}</span>
                              </span>
                            );
                          })}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-7 bg-gray-50 dark:bg-zinc-900 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 animate-fade-in">
                    <p className="text-gray-500 font-medium text-[14px]">관람 일자를 먼저 선택해주세요.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Phase 2: Seat Selection (Current UI)
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 pb-32 animate-fade-in [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex justify-between items-center bg-white dark:bg-zinc-800 p-5 rounded-2xl border border-gray-200 dark:border-zinc-700 shadow-sm mb-4 shrink-0">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">선택된 일시</span>
                  <span className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                    {selectedDate} <span className="text-gray-300">|</span> {selectedTime}
                  </span>
                </div>
                {(!isCancelMode || isModifyModeActive) && (
                  <button
                    onClick={() => setIsModifyingSchedule(true)}
                    className="text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors text-gray-600 bg-gray-100 dark:bg-zinc-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-600"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 2v6h-6"></path>
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                      <path d="M3 3v5h5"></path>
                    </svg>
                    일시 변경
                  </button>
                )}
                {isCancelMode && !isModifyModeActive && (
                  <button
                    onClick={() => setIsModifyModeActive(true)}
                    className="text-sm font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-4 py-2.5 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2"
                  >
                    예약 변경 모드로 전환
                  </button>
                )}
              </div>

              <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-4 shrink-0">
                <div className="text-[22px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {isCancelMode && !isModifyModeActive ? '취소할 좌석' : '선택 좌석'} <span className="text-blue-500 font-extrabold">{cartSeats.size}</span>
                  {!isCancelMode && <span className="text-gray-300 dark:text-gray-600 font-medium text-lg">/ 4</span>}
                </div>
                {cartSeats.size > 0 && (
                  <button
                    onClick={() => {
                      if (isCancelMode && !isModifyModeActive) {
                        setSelectedSeatsToCancel(new Set());
                      } else if (isModifyModeActive) {
                        setSelectedSeatsToCancel(new Set(initialSeats));
                        setSelectedSeats(new Set());
                      } else {
                        setSelectedSeats(new Set());
                      }
                    }}
                    className="text-[16px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
                  >
                    전체삭제
                  </button>
                )}
              </div>

              {cartSeats.size === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4 py-20">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <p className="font-medium text-lg">선택된 좌석이 없습니다</p>
                </div>
              ) : (
                <div className="flex flex-col animate-fade-in pb-4">
                  {Array.from(cartSeats).map(seatId => {
                    const { grade, price } = getSeatInfo(seatId);

                    const gradeDotColors: Record<string, string> = {
                      'VIP': 'grade-dot-vip',
                      'R': 'grade-dot-r',
                      'S': 'grade-dot-s',
                      'A': 'grade-dot-a',
                    };
                    const dotClass = gradeDotColors[grade] || 'bg-gray-400';

                    return (
                      <div
                        key={seatId}
                        className="flex justify-between items-center p-4 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 group hover:border-gray-200 dark:hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex flex-col gap-1">
                          {isModifyModeActive && (
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              {initialSeats.includes(seatId)
                                ? `${initialSchedule?.date} ${initialSchedule?.time}`
                                : `${confirmedSchedule?.date} ${confirmedSchedule?.time}`}
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${dotClass}`}></span>
                            <span className="font-black text-gray-900 dark:text-white text-base">{grade}석</span>
                            {isModifyModeActive && initialSeats.includes(seatId) && (
                              <span className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold">
                                기존
                              </span>
                            )}
                          </div>
                          <span className="text-gray-500 dark:text-gray-400 text-[13px] font-medium ml-5">{getDetailedSeatInfo(seatId)}</span>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-black text-lg text-gray-900 dark:text-white tracking-tight">
                            {isWaitlistMode ? (
                              <span className="text-blue-600">대기 {(seatId.charCodeAt(0) + (parseInt(seatId.slice(1)) || 0)) * 2 % 45 + 1}명</span>
                            ) : (
                              `${price.toLocaleString()}원`
                            )}
                          </span>

                          <button
                            onClick={() => {
                              if (isCancelMode && !isModifyModeActive) {
                                setSelectedSeatsToCancel(new Set([...selectedSeatsToCancel].filter(s => s !== seatId)));
                              } else if (isModifyModeActive) {
                                if (initialSeats.includes(seatId)) {
                                  setSelectedSeatsToCancel(new Set([...selectedSeatsToCancel, seatId]));
                                } else {
                                  setSelectedSeats(new Set([...selectedSeats].filter(s => s !== seatId)));
                                }
                              } else {
                                setSelectedSeats(new Set([...selectedSeats].filter(s => s !== seatId)));
                              }
                            }}
                            className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 transition-colors p-1"
                            aria-label="삭제"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Checkout Bar at bottom of right panel */}
          {scheduleId && ((isCancelMode && !isModifyModeActive ? selectedSeatsToCancel.size > 0 : selectedSeats.size > 0) || isModifyModeActive) && !isModifyingSchedule && bookingStep === 'SEAT' && (
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] flex justify-between items-center z-20 animate-slide-up">
              {isCancelMode && !isModifyModeActive ? (
                <>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500 font-medium">취소할 좌석</span>
                    <span className="text-2xl font-extrabold text-red-600">
                      {effectiveSeatsToCancel.size}개
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      alert('취소가 완료되었습니다. (임시 동작)');
                      onClose();
                    }}
                    className="px-10 py-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-600/20"
                  >
                    선택한 좌석 취소
                  </button>
                </>
              ) : isModifyModeActive ? (
                <>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500 font-medium">취소 {effectiveSeatsToCancel.size}개 / 추가 {selectedSeats.size}개</span>
                    <span className="text-2xl font-extrabold text-blue-600">
                      변경 사항 저장
                    </span>
                  </div>
                  <button
                    onClick={async (e) => {
                      if (!e.isTrusted) {
                        window.location.href = '/blocked';
                        return;
                      }
                      if (selectedSeats.size > 0) {
                        await handleNextStep();
                      } else {
                        alert('예약 변경이 완료되었습니다. (임시 동작)');
                        onClose();
                      }
                    }}
                    className="px-10 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-600/20"
                  >
                    {selectedSeats.size > 0 ? (isWaitlistMode ? '대기하기' : '인원 선택') : '변경 사항 저장'}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500 font-medium">
                      {isWaitlistMode ? '선택된 좌석 수' : '총 결제 금액'}
                    </span>
                    <span className="text-2xl font-extrabold text-blue-600">
                      {isWaitlistMode
                        ? `${selectedSeats.size}개`
                        : `${Array.from(selectedSeats).reduce((sum, seatId) => sum + getSeatInfo(seatId).price, 0).toLocaleString()}원`}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      if (!e.isTrusted) {
                        window.location.href = '/blocked';
                        return;
                      }
                      handleNextStep();
                    }}
                    className="px-10 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-600/20"
                  >
                    {isWaitlistMode ? '예약하기' : '인원 선택'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Ticket Type Selection Step */}
          {bookingStep === 'TICKET_TYPE' && (() => {
            // 등급별 좌석 수 집계
            const gradeSeats: Record<string, string[]> = {};
            Array.from(selectedSeats).forEach(seatId => {
              const { grade } = getSeatInfo(seatId);
              if (!gradeSeats[grade]) gradeSeats[grade] = [];
              gradeSeats[grade].push(seatId);
            });

            const gradeDotColors: Record<string, string> = {
              'VIP': 'grade-dot-vip',
              'R': 'grade-dot-r',
              'S': 'grade-dot-s',
              'A': 'grade-dot-a',
            };

            const getGradeTotal = (grade: string) => {
              const counts = gradeTicketCounts[grade] || {};
              return Object.values(counts).reduce((s, n) => s + n, 0);
            };

            const getGradePrice = (grade: string) => {
              const gradePriceInfo = eventDetail?.zonePrices.find(p => p.grade === grade);
              const price = gradePriceInfo?.price || 0;
              const types = gradePriceInfo?.discountInfo?.length ? gradePriceInfo.discountInfo : [{ discountName: '일반', discountRate: 0, actualPriceAmount: price }];
              const counts = gradeTicketCounts[grade] || {};
              return Object.entries(counts).reduce((sum, [typeId, count]) => {
                const type = types.find(t => t.discountName === typeId);
                const typePrice = type ? type.actualPriceAmount : price;
                return sum + typePrice * count;
              }, 0);
            };

            const totalPrice = Object.keys(gradeSeats).reduce((sum, grade) => sum + getGradePrice(grade), 0);
            const originalPrice = Object.entries(gradeSeats).reduce((sum, [grade, seats]) => {
              const price = eventDetail?.zonePrices.find(p => p.grade === grade)?.price || 0;
              return sum + price * seats.length;
            }, 0);
            const discountAmount = originalPrice - totalPrice;

            const handleCount = (grade: string, typeId: string, delta: number) => {
              setGradeTicketCounts(prev => {
                const gradeCounts = { ...(prev[grade] || {}) };
                const current = gradeCounts[typeId] || 0;
                const newVal = Math.max(0, current + delta);
                const maxForGrade = gradeSeats[grade].length;
                const otherTotal = Object.entries(gradeCounts)
                  .filter(([id]) => id !== typeId)
                  .reduce((s, [, n]) => s + n, 0);
                if (otherTotal + newVal > maxForGrade) return prev;
                gradeCounts[typeId] = newVal;
                return { ...prev, [grade]: gradeCounts };
              });
            };

            return (
              <div className="absolute inset-0 bg-gray-50 dark:bg-zinc-950 flex flex-col z-30 animate-fade-in">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-zinc-800 flex items-center gap-3 shrink-0">
                  <button
                    onClick={async () => {
                      if (scheduleId) {
                        try {
                          await seatApi.releaseSeat(eventDetail.eventId, scheduleId, '1');
                        } catch (err) {
                          console.error('Failed to release seats', err);
                        }
                      }
                      setBookingStep('SEAT');
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                    aria-label="뒤로"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">인원 선택</h2>
                </div>

                {/* Grade list with Accordions */}
                <div className="flex-1 overflow-y-auto px-3 py-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <p className="text-sm text-gray-500 mb-5 px-3">좌석 등급별로 관람 인원 유형을 선택해주세요.</p>
                  <div className="flex flex-col gap-3">
                    {Object.entries(gradeSeats).map(([grade, seats]) => {
                      const maxCount = seats.length;
                      const currentTotal = getGradeTotal(grade);
                      const dotClass = gradeDotColors[grade] || 'bg-gray-400';
                      const price = eventDetail?.zonePrices.find(p => p.grade === grade)?.price || 0;
                      const isFull = currentTotal >= maxCount;

                      return (
                        <div key={grade} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
                          <Accordion
                            isOpen={openGrade === grade}
                            onToggle={(isOpen) => setOpenGrade(isOpen ? grade : null)}
                            title={
                              <div className="flex items-center justify-between w-full pr-2">
                                <div className="flex items-center gap-3">
                                  <span className={`w-3.5 h-3.5 rounded-full ${dotClass}`} />
                                  <span className="font-bold text-gray-900 dark:text-white text-[15px]">{grade}석</span>
                                  <span className="text-xs text-gray-400 font-medium">{seats.join(', ')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-extrabold px-2.5 py-1 rounded-full ${isFull
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-orange-100 text-orange-600'
                                    }`}>
                                    {currentTotal} / {maxCount}
                                  </span>
                                </div>
                              </div>
                            }
                          >
                            <div className="flex flex-col gap-2 px-1">
                              {(() => {
                                const gradePriceInfo = eventDetail?.zonePrices.find(p => p.grade === grade);
                                const price = gradePriceInfo?.price || 0;
                                const types = gradePriceInfo?.discountInfo?.length ? gradePriceInfo.discountInfo : [{ discountName: '일반', discountRate: 0, actualPriceAmount: price }];

                                return types.map(type => {
                                  const count = gradeTicketCounts[grade]?.[type.discountName] || 0;
                                  const typePrice = type.actualPriceAmount;
                                  const canAdd = currentTotal < maxCount;
                                  const canRemove = count > 0;

                                  return (
                                    <div
                                      key={type.discountName}
                                      className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${count > 0
                                        ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800'
                                        : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                                        }`}
                                    >
                                      <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                          <span className={`font-bold text-[14px] ${count > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {type.discountName}
                                          </span>
                                          {type.discountRate > 0 && (
                                            <span className="text-[11px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                                              {type.discountRate}%↓
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-xs text-gray-500">{typePrice.toLocaleString()}원</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <button
                                          onClick={() => handleCount(grade, type.discountName, -1)}
                                          disabled={!canRemove}
                                          className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all ${canRemove
                                            ? 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 active:scale-90'
                                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-300 dark:text-zinc-600 cursor-not-allowed'
                                            }`}
                                        >
                                          −
                                        </button>
                                        <span className={`w-6 text-center font-extrabold text-[16px] ${count > 0 ? 'text-blue-600' : 'text-gray-400'
                                          }`}>{count}</span>
                                        <button
                                          onClick={() => handleCount(grade, type.discountName, 1)}
                                          disabled={!canAdd}
                                          className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all ${canAdd
                                            ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-90'
                                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-300 dark:text-zinc-600 cursor-not-allowed'
                                            }`}
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </Accordion>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom checkout bar */}
                <div className="p-6 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400 font-medium">좌석 금액</span>
                      <span className="text-sm text-gray-400 line-through">{originalPrice.toLocaleString()}원</span>
                      {discountAmount > 0 && (
                        <span className="text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">-{discountAmount.toLocaleString()}원</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-gray-500 font-medium">총 결제 금액</span>
                      <span className="text-2xl font-extrabold text-blue-600 ml-1">
                        {totalPrice.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                  <button
                    disabled={Object.keys(gradeSeats).some(g => getGradeTotal(g) !== gradeSeats[g].length)}
                    onClick={async () => {
                      await finalizeTrial();
                      setBookingStep('PAYMENT');
                    }}
                    className={`px-10 py-4 rounded-xl font-bold text-lg transition-all shadow-md ${Object.keys(gradeSeats).some(g => getGradeTotal(g) !== gradeSeats[g].length)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-blue-600/20'
                      }`}
                  >
                    다음 단계
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Payment Step Overlay */}
      {(bookingStep === 'PAYMENT' || bookingStep === 'PAY_METHOD') && (() => {
        // 등급별 좌석 집계
        const gradeSeats: Record<string, string[]> = {};
        Array.from(selectedSeats).forEach(seatId => {
          const { grade } = getSeatInfo(seatId);
          if (!gradeSeats[grade]) gradeSeats[grade] = [];
          gradeSeats[grade].push(seatId);
        });

        const gradeDotColors: Record<string, string> = {
          'VIP': 'grade-dot-vip',
          'R': 'grade-dot-r',
          'S': 'grade-dot-s',
          'A': 'grade-dot-a',
        };

        const ticketPrice = Object.entries(gradeSeats).reduce((sum, [grade, seats]) => {
          const price = eventDetail?.zonePrices.find(p => p.grade === grade)?.price || 0;
          const counts = gradeTicketCounts[grade] || {};
          return sum + Object.entries(counts).reduce((s, [typeId, count]) => {
            const type = ticketTypes.find(t => t.id === typeId);
            return s + Math.round(price * (1 - (type?.discount || 0) / 100)) * count;
          }, 0);
        }, 0);
        const bookingFee = Math.round(ticketPrice * 0.05); // 5% 예매 수수료
        const finalPrice = ticketPrice + bookingFee;

        const handleAgreeAll = (val: boolean) => {
          setAgreeAll(val);
          setAgreeTerm1(val);
          setAgreeTerm2(val);
        };

        const canPay = buyerName.trim() && buyerEmail.trim() && buyerPhone.trim() && agreeTerm1 && agreeTerm2;

        const payMethods = [
          {
            id: 'kakaopay',
            label: '카카오페이',
            selectedColor: 'border-[#FEE500] bg-[#FEE500] text-[#381E1F]',
            icon: <Image src="/images/payment_icon_yellow_small.png" alt="카카오페이" width={60} height={20} className="h-5 w-auto object-contain mr-2" />
          },
          {
            id: 'naverpay',
            label: '네이버페이',
            selectedColor: 'border-[#03C75A] bg-[#03C75A] text-white',
            icon: <Image src="/images/logo_npaybk_large.svg" alt="네이버페이" width={60} height={20} className="h-5 w-auto object-contain mr-2" />
          },
          {
            id: 'tosspay',
            label: '토스페이',
            selectedColor: 'border-[#3182F6] bg-[#3182F6] text-white',
            icon: <Image src="/images/Toss_Symbol_Primary.png" alt="토스페이" width={60} height={20} className="h-5 w-auto object-contain mr-2" />
          },
          {
            id: 'payco',
            label: 'PAYCO',
            selectedColor: 'border-[#E31C18] bg-[#E31C18] text-white',
            icon: <span className="w-5 h-5 flex items-center justify-center bg-white text-[#E31C18] border border-[#E31C18] rounded-[4px] text-[13px] font-black mr-2 leading-none italic">P</span>
          },
        ];
        const otherMethods = [
          {
            id: 'credit',
            label: '신용카드',
            selectedColor: 'border-blue-500 bg-blue-500 text-white shadow-md',
            icon: null
          },
          {
            id: 'bank',
            label: '계좌이체',
            selectedColor: 'border-blue-500 bg-blue-500 text-white shadow-md',
            icon: null
          },
          {
            id: 'phone',
            label: '휴대폰 결제',
            selectedColor: 'border-blue-500 bg-blue-500 text-white shadow-md',
            icon: null
          },
          {
            id: 'vbank',
            label: '무통장입금',
            selectedColor: 'border-blue-500 bg-blue-500 text-white shadow-md',
            icon: null
          },
        ];

        return (
          <div className="absolute inset-0 top-[73px] flex bg-white dark:bg-zinc-950 z-40 animate-fade-in border-t border-gray-200 dark:border-zinc-800">
            {/* Left: 예매자 정보 + 약관 동의 */}
            <div className="w-[60%] h-full overflow-y-auto p-8 flex flex-col gap-6 border-r border-gray-200 dark:border-zinc-800 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

              <button
                onClick={() => setBookingStep(bookingStep === 'PAYMENT' ? 'TICKET_TYPE' : 'PAYMENT')}
                className="self-start px-4 py-2 text-gray-600 dark:text-gray-300 font-bold text-sm border border-gray-300 dark:border-zinc-600 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                전단계로 돌아가기
              </button>

              {bookingStep === 'PAYMENT' ? (
                <>

                  {/* 예매자 정보 */}
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 rounded-t-2xl">
                      <h3 className="font-extrabold text-[16px] text-gray-900 dark:text-white">예매자 정보</h3>
                    </div>
                    <div className="p-6 flex flex-col gap-5">
                      <div className="flex items-center gap-4">
                        <label className="w-24 text-sm font-bold text-gray-600 dark:text-gray-400 shrink-0">예매자 이름</label>
                        <input
                          type="text"
                          value={buyerName}
                          onChange={e => setBuyerName(e.target.value)}
                          placeholder="이름 입력"
                          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="w-24 text-sm font-bold text-gray-600 dark:text-gray-400 shrink-0">이메일</label>
                        <input
                          type="email"
                          value={buyerEmail}
                          onChange={e => setBuyerEmail(e.target.value)}
                          placeholder="이메일 입력"
                          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="w-24 text-sm font-bold text-gray-600 dark:text-gray-400 shrink-0">전화번호</label>
                        <input
                          type="tel"
                          value={buyerPhone}
                          onChange={e => setBuyerPhone(e.target.value)}
                          placeholder="전화번호 입력"
                          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 약관 동의 */}
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 rounded-t-2xl">
                      <h3 className="font-extrabold text-[16px] text-gray-900 dark:text-white">약관 동의</h3>
                    </div>
                    <div className="p-6 flex flex-col gap-3">
                      {/* 전체 동의 */}
                      <div className="flex items-center gap-3 px-4 py-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <Toggle checked={agreeAll} onChange={handleAgreeAll} size="small" />
                        <span className="font-bold text-blue-700 dark:text-blue-400 text-sm">전체 동의합니다.</span>
                      </div>

                      {/* 예매 이용 약관 */}
                      <div className={`rounded-xl border transition-colors ${agreeTerm1 ? 'border-blue-200 dark:border-blue-800' : 'border-gray-200 dark:border-zinc-700'}`}>
                        <div className="flex items-center gap-3 px-4 py-3.5">
                          <Toggle checked={agreeTerm1} onChange={(val) => { setAgreeTerm1(val); if (!val) setAgreeAll(false); else if (agreeTerm2) setAgreeAll(true); }} size="small" />
                          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">예매 이용 약관 (필수)</span>
                          <button
                            onClick={() => setTermExpand1(!termExpand1)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-full transition-colors"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                              className={`transition-transform duration-300 text-gray-400 ${termExpand1 ? 'rotate-180' : ''}`}
                            >
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </button>
                        </div>
                        <div className={`grid transition-all duration-300 ease-in-out ${termExpand1 ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                          <div className="overflow-hidden min-h-0">
                            <div className="px-4 pb-4">
                              <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-h-32 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                <p className="font-bold mb-2">제1조 (목적)</p>
                                <p className="mb-2">이 약관은 티클(이하 "회사")이 제공하는 온라인 예매 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
                                <p className="font-bold mb-2">제2조 (예매 서비스)</p>
                                <p className="mb-2">예매 완료 후 취소 시 취소 수수료가 부과될 수 있으며, 공연일 기준 7일 전까지 무료 취소가 가능합니다. 공연 당일 취소 및 환불은 불가합니다.</p>
                                <p className="font-bold mb-2">제3조 (티켓 양도)</p>
                                <p>예매된 티켓은 타인에게 양도할 수 없으며, 부정 양도 적발 시 입장이 제한될 수 있습니다.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 개인정보 수집 동의 */}
                      <div className={`rounded-xl border transition-colors ${agreeTerm2 ? 'border-blue-200 dark:border-blue-800' : 'border-gray-200 dark:border-zinc-700'}`}>
                        <div className="flex items-center gap-3 px-4 py-3.5">
                          <Toggle checked={agreeTerm2} onChange={(val) => { setAgreeTerm2(val); if (!val) setAgreeAll(false); else if (agreeTerm1) setAgreeAll(true); }} size="small" />
                          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">개인정보 수집 동의 (필수)</span>
                          <button
                            onClick={() => setTermExpand2(!termExpand2)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-full transition-colors"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                              className={`transition-transform duration-300 text-gray-400 ${termExpand2 ? 'rotate-180' : ''}`}
                            >
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </button>
                        </div>
                        <div className={`grid transition-all duration-300 ease-in-out ${termExpand2 ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                          <div className="overflow-hidden min-h-0">
                            <div className="px-4 pb-4">
                              <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-h-32 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                <p className="font-bold mb-2">수집 항목</p>
                                <p className="mb-2">예매자 이름, 이메일, 전화번호, 결제 정보</p>
                                <p className="font-bold mb-2">수집 목적</p>
                                <p className="mb-2">예매 확인 및 안내, 본인 확인, 고객 상담, 마케팅 정보 제공 (선택 동의 시)</p>
                                <p className="font-bold mb-2">보유 기간</p>
                                <p>공연 종료 후 3개월까지 보관하며, 관련 법령에 의한 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* 결제 수단 선택 */}
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 rounded-t-2xl flex items-center justify-between">
                      <h3 className="font-extrabold text-[16px] text-gray-900 dark:text-white">결제 수단</h3>
                    </div>
                    <div className="p-6 flex flex-col gap-3">
                      {/* 페이 결제 */}
                      <div
                        className={`rounded-xl border-2 transition-all cursor-pointer ${payCategory === 'pay'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300'
                          }`}
                        onClick={() => { setPayCategory('pay'); setSelectedPayMethod(null); }}
                      >
                        <div className="flex items-center gap-3 px-4 py-3.5">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${payCategory === 'pay' ? 'border-blue-500' : 'border-gray-300'
                            }`}>
                            {payCategory === 'pay' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                          </div>
                          <span className={`font-bold text-sm ${payCategory === 'pay' ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                            }`}>페이 결제</span>
                        </div>
                        <div className={`grid transition-all duration-300 ease-in-out ${payCategory === 'pay' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                          <div className="overflow-hidden min-h-0">
                            <div className="px-4 pb-4 pt-1.5 grid grid-cols-2 gap-3">
                              {payMethods.map(m => (
                                <button
                                  key={m.id}
                                  onClick={(e) => { e.stopPropagation(); setSelectedPayMethod(m.id); }}
                                  className={`relative py-4 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center hover:z-10 ${selectedPayMethod === m.id
                                    ? `${m.selectedColor} shadow-sm scale-[1.02] z-10`
                                    : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-600 hover:border-gray-400 z-0'
                                    }`}
                                >
                                  {m.icon}
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 다른 결제 방법 */}
                      <div
                        className={`rounded-xl border-2 transition-all cursor-pointer ${payCategory === 'other'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300'
                          }`}
                        onClick={() => { setPayCategory('other'); setSelectedPayMethod(null); }}
                      >
                        <div className="flex items-center gap-3 px-4 py-3.5">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${payCategory === 'other' ? 'border-blue-500' : 'border-gray-300'
                            }`}>
                            {payCategory === 'other' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                          </div>
                          <span className={`font-bold text-sm ${payCategory === 'other' ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                            }`}>다른 결제 방법</span>
                        </div>
                        <div className={`grid transition-all duration-300 ease-in-out ${payCategory === 'other' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                          <div className="overflow-hidden min-h-0">
                            <div className="px-4 pb-4 pt-1.5 grid grid-cols-2 gap-3">
                              {otherMethods.map(m => (
                                <button
                                  key={m.id}
                                  onClick={(e) => { e.stopPropagation(); setSelectedPayMethod(m.id); }}
                                  className={`relative py-4 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center hover:z-10 ${selectedPayMethod === m.id
                                    ? `${m.selectedColor} shadow-sm scale-[1.02] z-10`
                                    : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-600 hover:border-gray-400 z-0'
                                    }`}
                                >
                                  {m.icon}
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right: 좌석 정보 + 결제 금액 */}
            <div className="w-[40%] h-full flex flex-col bg-gray-50 dark:bg-zinc-950">
              {/* 좌석 정보 */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
                  <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 rounded-t-2xl">
                    <h3 className="font-extrabold text-[16px] text-gray-900 dark:text-white">좌석 정보</h3>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {Object.entries(gradeSeats).map(([grade, seats]) => {
                      const dotClass = gradeDotColors[grade] || 'bg-gray-400';
                      const counts = gradeTicketCounts[grade] || {};
                      let gradeTotalPrice = 0;

                      const gradePriceInfo = eventDetail?.zonePrices.find(p => p.grade === grade);
                      if (gradePriceInfo) {
                        const types = gradePriceInfo.discountInfo?.length ? gradePriceInfo.discountInfo : [{ discountName: '일반', discountRate: 0, actualPriceAmount: gradePriceInfo.price }];
                        Object.entries(counts).forEach(([typeId, count]) => {
                          const typeInfo = types.find(t => t.discountName === typeId);
                          if (typeInfo) {
                            gradeTotalPrice += count * typeInfo.actualPriceAmount;
                          }
                        });
                      }

                      return (
                        <div key={grade} className="px-6 py-4 flex items-center justify-between">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${dotClass}`} />
                              <span className="font-bold text-gray-900 dark:text-white text-[15px]">{grade}석</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5 ml-5 mt-0.5">
                              <span className="text-[13px] text-gray-500 leading-none">{seats.join(', ')}</span>
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(counts).filter(([, c]) => c > 0).map(([typeId, count]) => {
                                  return (
                                    <span key={typeId} className="text-[11px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium px-2 py-0.5 rounded-md">
                                      {typeId} {count}매
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <span className="font-extrabold text-gray-900 dark:text-white text-sm">
                            {gradeTotalPrice > 0 ? `${gradeTotalPrice.toLocaleString()}원` : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 결제 금액 */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
                  <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 rounded-t-2xl">
                    <h3 className="font-extrabold text-[16px] text-gray-900 dark:text-white">결제 금액</h3>
                  </div>
                  <div className="p-6 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">티켓 금액</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{ticketPrice.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">예매 수수료 (5%)</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{bookingFee.toLocaleString()}원</span>
                    </div>
                    <div className="h-px bg-gray-200 dark:bg-zinc-700 my-1" />
                    <div className="flex justify-between items-center">
                      <span className="text-base font-extrabold text-gray-900 dark:text-white">총 결제 금액</span>
                      <span className="text-xl font-extrabold text-blue-600">{finalPrice.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 결제 버튼 */}
              <div className="p-6 shrink-0 border-t border-gray-200 dark:border-zinc-800">
                {bookingStep === 'PAYMENT' ? (
                  <button
                    disabled={!canPay}
                    onClick={() => setBookingStep('PAY_METHOD')}
                    className={`w-full py-4 rounded-2xl font-extrabold text-lg transition-all ${canPay
                      ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-lg shadow-blue-600/25'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    결제 수단 선택
                  </button>
                ) : (
                  <button
                    disabled={!selectedPayMethod}
                    onClick={async () => {
                      // TODO: 실제 결제 처리 API 호출 등의 로직을 이곳에 추가하세요.
                      console.log(`결제 수단: ${selectedPayMethod}, 결제 금액: ${finalPrice.toLocaleString()}원`);
                    }}
                    className={`w-full py-4 rounded-2xl font-extrabold text-lg transition-all ${selectedPayMethod
                      ? 'bg-red-500 text-white hover:bg-red-600 active:scale-[0.98] shadow-lg shadow-red-500/25'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    data-track-id="payment-confirm"
                  >
                    {finalPrice.toLocaleString()}원 결제하기
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}



      <Modal
        isOpen={isExitModalOpen}
        onClose={handleCancelExit}
        title="대기열 퇴장"
        description="대기열에서 퇴장하시겠습니까? 다시 진입 시 대기 순서가 초기화됩니다."
        confirmText="퇴장하기"
        cancelText="계속 대기"
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
      />

      <Modal
        isOpen={isWaitlistCompleteModalOpen}
        onClose={() => { }}
        title="취소표 대기 신청 완료"
        description="해당 좌석에 대한 취소표 대기 신청이 성공적으로 완료되었습니다. 취소표 발생 시 알림을 보내드립니다."
        confirmText="확인"
        onConfirm={() => {
          setIsWaitlistCompleteModalOpen(false);
          onClose(); // DetailView로 복귀
        }}
        showCancelButton={false}
      />

      {/* 이미 선점된 좌석 알림 모달 */}
      {isConflictModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-[400px] shadow-2xl overflow-hidden animate-slide-up relative flex flex-col">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">이미 선점된 좌석입니다</h2>
              <p className="text-gray-500 dark:text-gray-400 text-[15px] leading-relaxed mb-8">
                선택하신 좌석 중 누군가 먼저 결제를 진행 중인 좌석이 포함되어 있습니다. 좌석을 다시 선택해 주세요.
              </p>
              <button
                onClick={() => {
                  setIsConflictModalOpen(false);
                  setSelectedSeats(new Set());
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-[16px] py-4 rounded-xl transition-colors shadow-md shadow-red-600/20 active:scale-95"
              >
                다시 선택하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
