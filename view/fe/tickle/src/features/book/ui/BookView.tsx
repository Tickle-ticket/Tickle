'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSeatData } from '@/src/features/book/api/useSeatData';
import { seatApi } from '@/src/shared/api/seatApi';
import { bookingApi } from '@/src/shared/api/bookingApi';
import { paymentApi } from '@/src/shared/api/paymentApi';
import { createCancellationWaitCandidates } from '@/src/shared/api/cancellationApi';
import { useQuery } from '@tanstack/react-query';
import { reservationApi } from '@/src/shared/api/reservationApi';


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
import { isShadowMode } from '@/src/shared/utils/shadowMode';
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
  storyMode?: boolean;
}

const toBehaviorEventDate = (date?: string | null) => date?.replace(/\./g, '-') ?? null;

export const BookView = ({ onClose, eventId, mode = 'BOOK', initialSchedule, initialSeats = [], initialModifyModeActive = false, initialModifyingSchedule = false, admitToken, storyMode = false }: BookViewProps) => {
  const isShadowModeActive = isShadowMode(eventId);
  const isWaitlistMode = mode === 'WAITLIST' || isShadowModeActive;
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
  const [isInvalidAccess, setIsInvalidAccess] = useState(false);

  const handleCloseErrorModal = () => {
    setErrorModalConfig(prev => ({ ...prev, isOpen: false }));
    if (errorModalConfig.onConfirm) {
      errorModalConfig.onConfirm();
    }
  };

  const { fetchOptions, submitPreorder, isOptionsLoading, isPreorderLoading, optionsData, setOptionsData } = useBookingPreorder();

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
  const preorderBookingIdRef = useRef<number | null>(null);
  useEffect(() => {
    preorderBookingIdRef.current = preorderBookingId;
  }, [preorderBookingId]);

  const { data: seatAvailability, venueId, isLoading: isSeatsLoading, error: seatError } = useSeatData(
    eventDetail?.eventId || null,
    scheduleId,
    enableWs,
    mode === 'WAITLIST' ? 'WAITLIST' : 'BOOKING',
    admitToken || null,
    storyMode
  );

  const { data: ownershipCountResponse } = useQuery({
    queryKey: ['ownershipCount', eventDetail?.eventId, scheduleId, userProfile?.userId],
    queryFn: async () => {
      if (!eventDetail?.eventId || !scheduleId || !userProfile?.userId) return null;
      if (isShadowMode(eventDetail.eventId)) return { totalCount: 0 };
      const res = await reservationApi.getOwnershipCount(eventDetail.eventId, scheduleId, userProfile.userId);
      return res.data;
    },
    enabled: !!eventDetail?.eventId && !!scheduleId && !!userProfile?.userId,
    staleTime: 0,
    gcTime: 0,
  });

  const maxSelectable = isShadowModeActive ? 99 : Math.max(0, 4 - (ownershipCountResponse?.totalCount || 0));

  // 현재 선점 중인 상태를 ref로 추적하여, 렌더링마다 불필요하게 해제되지 않도록 함
  const isHoldingSeatRef = React.useRef(false);
  
  useEffect(() => {
    isHoldingSeatRef.current = bookingStep !== 'SEAT' && mode === 'BOOK' && !!eventDetail?.eventId && !!scheduleId;
  }, [bookingStep, mode, eventDetail?.eventId, scheduleId]);

  // 이탈 시 선점 좌석 자동 해제 로직
  useEffect(() => {
    const releaseHeldSeat = () => {
      // 결제 성공/카카오페이 리다이렉트 등으로 인한 정상적인 이탈인 경우 방지
      const isNormalNavigation = (window as any).__isNavigatingToPayment__ === true;
      
      if (!isNormalNavigation) {
        if (preorderBookingIdRef.current) {
          reservationApi.cancelReservation(preorderBookingIdRef.current).catch(err => {
            console.error('Failed to cancel draft reservation on unmount:', err);
          });
        } else if (isHoldingSeatRef.current && eventDetail?.eventId && scheduleId) {
          seatApi.releaseSeat(eventDetail.eventId, scheduleId).catch((err) => {
            console.error('Failed to release seat on exit:', err);
          });
        }
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isNormalNavigation = (window as any).__isNavigatingToPayment__ === true;
      if (isHoldingSeatRef.current && !isNormalNavigation) {
        releaseHeldSeat();
        e.preventDefault();
        e.returnValue = ''; // 표준 브라우저 경고창 표시
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
              <div className="flex items-center justify-center h-full min-h-[600px] text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
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
      } catch (err: any) {
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
      if (preorderBookingId) {
        reservationApi.cancelReservation(preorderBookingId).catch(console.error);
      } else if (scheduleId && eventDetail && userProfile?.userId) {
        seatApi.releaseSeat(eventDetail.eventId, scheduleId).catch(console.error);
      }
      setErrorModalConfig({
        isOpen: true,
        title: '결제 시간 초과',
        message: '결제 시간이 초과되어 예매가 취소되었습니다.',
        onConfirm: onClose
      });
    }
  }, [timeLeft, bookingStep, isModifyModeActive, scheduleId, eventDetail, userProfile, onClose, preorderBookingId]);

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

  if (isInvalidAccess) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">잘못된 접근입니다</h1>
          <p className="text-gray-500">
            예매 정보가 만료되었거나 비정상적인 접근입니다.
          </p>
          <button 
            onClick={() => { window.location.href = '/'; }}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800:bg-gray-100 transition-colors"
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
        <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 gap-4">
          <p className="text-red-500 font-medium">예매 정보를 불러오는데 실패했습니다.</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition">닫기</button>
        </div>
      );
    }
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 gap-4">
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

      const isSelectable = isShadowModeActive ? info.isAvailable : isWaitlistMode ? !!info.waitable : (info.isAvailable || isMyInitialSeat);
      const isSelected = isMyInitialSeat ? selectedSeatsToCancel.has(seatId) : selectedSeats.has(seatId);
      
      const reachedMax = selectedSeats.size >= maxSelectable;
      const canToggle = !reachedMax || isSelected || isMyInitialSeat;
      const status: SeatStatus = (isSelectable && canToggle) ? 'selectable' : 'disabled';

      let congestion: 'high' | 'medium' | 'low' | 'none' = 'none';
      if (isWaitlistMode && !info.isAvailable) {
        const count = info.waitingCount || 0;
        if (count >= 10) congestion = 'high';
        else if (count >= 5) congestion = 'medium';
        else congestion = 'low';
      }

      if (bookingStep === 'TICKET_TYPE' && !isSelected) {
        seatsData[seatId] = { status: 'disabled' as SeatStatus, isSelected: false, color: 'disabled' as SeatColor, congestion, sessionSeatId: info.sessionSeatId, detailedInfo: info.detailedInfo };
      } else {
        const gradeColor = isMyInitialSeat ? 'vip' : ((!isSelectable && isWaitlistMode && !isShadowModeActive) ? 'disabled' : (info.priceGrade?.toLowerCase() || '일반'));
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
      return { priceGrade, price, waitingCount: 0 };
    }
    const priceGrade = seatAvailability?.[seatId]?.priceGrade || '일반';
    const price = eventDetail?.zonePrices.find(p => p.priceGrade === priceGrade)?.price || 0;
    const waitingCount = seatAvailability?.[seatId]?.waitingCount || 0;
    return { priceGrade, price, waitingCount };
  };

  const getDetailedSeatInfo = (seatId: string) => {
    return seatsData[seatId]?.detailedInfo || seatId;
  };

  const handleSeatClick = async (id: string, e?: React.MouseEvent) => {
    if (e && !e.isTrusted) {
      window.location.href = '/blocked';
      return;
    }
    const isMyInitialSeat = initialSeats.includes(id);
    if (!selectedSeats.has(id) && !isMyInitialSeat && selectedSeats.size >= maxSelectable) {
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
        if (storyMode || isShadowModeActive) {
          await finalizeTrial();
          setIsWaitlistCompleteModalOpen(true);
        } else {
          if (!admitToken) {
            throw new Error('대기열 인증 토큰이 유효하지 않습니다.');
          }
          await createCancellationWaitCandidates(eventDetail.eventId, scheduleId!, admitToken, { sessionSeatIds });
          await finalizeTrial();
          setIsWaitlistCompleteModalOpen(true);
        }
      } else {
        if (sessionSeatIds.length > 0 && !storyMode) {
          // [Batch Hold] '다음 단계' 진입 시 일괄 검증 및 선점 요청
          await seatApi.holdSeat(eventDetail.eventId, scheduleId!, admitToken || '', { sessionSeatIds });

          // 선점 성공 시 옵션(권종/할인) 데이터 조회
          await fetchOptions(parseInt(eventDetail.eventId, 10), parseInt(scheduleId!, 10), sessionSeatIds);
        } else if (sessionSeatIds.length > 0 && storyMode) {
          // storyMode일 경우 가격 옵션 목데이터 주입
          const mockedSeats = Array.from(selectedSeats).map(seatId => {
            const { priceGrade, price } = getSeatInfo(seatId);
            const detailedInfo = getDetailedSeatInfo(seatId);
            const sessionSeatId = seatsData[seatId]?.sessionSeatId || Math.floor(Math.random() * 1000);
            
            return {
              sessionSeatId,
              seatLabel: detailedInfo,
              priceGrade,
              priceInfos: [
                { discountName: '일반', discountRate: 0, ticketPriceAmount: price },
                { discountName: '청소년할인', discountRate: 20, ticketPriceAmount: price * 0.8 },
                { discountName: '국가유공자할인', discountRate: 50, ticketPriceAmount: price * 0.5 },
              ]
            };
          });

          setOptionsData({
            eventId: eventDetail.eventId,
            sessionId: parseInt(scheduleId!, 10),
            currencyCode: 'KRW',
            totalTicketPriceAmount: mockedSeats.reduce((sum, s) => sum + s.priceInfos[0].ticketPriceAmount, 0),
            seats: mockedSeats
          } as any);
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
        if (!storyMode) {
          await finalizeTrial();
        }

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
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-6 relative overflow-hidden">
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
    <div className="flex h-screen w-full flex-col bg-white overflow-hidden animate-fade-in">
      {/* Header */}
      <header className="w-full shrink-0 bg-white px-4 py-3 sm:p-6 shadow-sm flex items-center justify-between border-b border-gray-200 z-10">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={handleCloseClick}
            className="p-1.5 sm:p-2 hover:bg-gray-100:bg-zinc-800 rounded-full transition-colors"
            aria-label="닫기"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <h1 className="text-base sm:text-xl font-bold truncate">{bookingStep === 'PAY_METHOD' ? '결제 수단 선택' : bookingStep === 'PAYMENT' ? '결제 하기' : '좌석 선택'}</h1>
        </div>
        <div className="text-xs sm:text-sm font-medium text-gray-500 flex items-center gap-1.5 sm:gap-2 bg-gray-50 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full border border-gray-200">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span className="hidden sm:inline">예매 가능 시간</span> <span className="text-red-500 font-extrabold sm:ml-1">{formatTime(timeLeft)}</span>
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
          />
        </div>

        {/* Right Side Panel */}
        {/* Mobile: when schedule NOT confirmed → full screen schedule picker */}
        {/* Mobile: when schedule confirmed → transparent overlay floating on map */}
        {/* Desktop: always side-by-side panel */}
        <div className={`${(!confirmedSchedule || isModifyingSchedule)
          ? 'relative w-full h-full lg:absolute lg:right-0 lg:top-0 lg:w-[40%] lg:h-full bg-gray-50 overflow-y-auto'
          : `absolute inset-0 lg:right-0 lg:top-0 lg:left-auto lg:w-[40%] lg:bg-gray-50:bg-zinc-950 lg:overflow-y-auto lg:pointer-events-auto ${
              bookingStep === 'SEAT'
                ? 'pointer-events-none'
                : 'pointer-events-auto bg-gray-50 overflow-y-auto z-30'
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
                  if (storyMode) {
                    setPreorderBookingId(9999);
                    setBookingStep('PAYMENT');
                    return;
                  }

                  const res = await submitPreorder(
                    parseInt(eventDetail.eventId, 10),
                    parseInt(scheduleId!, 10),
                    seatIds,
                    optionSelections
                  );
                  if (res?.bookingId) {
                    setPreorderBookingId(res.bookingId);
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
          onCancel={async () => {
            if (preorderBookingId) {
              try {
                await reservationApi.cancelReservation(preorderBookingId);
                setPreorderBookingId(null);
              } catch (err) {
                console.error('Failed to cancel draft booking', err);
              }
            }
            // 예약 초안이 취소되면 백엔드에서 좌석 선점도 풀리므로 안전하게 SEAT 단계로 돌아가 다시 선점하도록 유도합니다.
            setBookingStep('SEAT');
          }}
          onConflictError={() => setIsConflictModalOpen(true)}
          onError={(title, message) => setErrorModalConfig({ isOpen: true, title, message })}
          storyMode={storyMode}
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
