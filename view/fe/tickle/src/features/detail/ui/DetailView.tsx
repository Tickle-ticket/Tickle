'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Title } from '@/src/shared/components/Title';
import { BannerSubtitle } from '@/src/shared/components/BannerSubtitle';
import { BannerPlace } from '@/src/shared/components/BannerPlace';
import { BannerTime } from '@/src/shared/components/BannerTime';
import Button from '@/src/shared/components/Button';
import { Text } from '@/src/shared/components/Text';
import { Table } from '@/src/shared/components/Table';
import { Box } from '@/src/shared/components/Box';
import { Calendar } from '@/src/shared/components/Calendar';
import { SectionNav } from '@/src/shared/components/SectionNav';
import { CountdownTimer } from '@/src/shared/components/CountdownTimer';
import { useDetailData } from '@/src/features/detail/api/useDetailData';
import { useDetailStore } from '@/src/shared/store/useDetailStore';
import { useBookStore } from '@/src/features/book/store/useBookStore';
import { BookView } from '@/src/features/book/ui/BookView';
import { QueueView } from '@/src/features/queue/ui/QueueView';
import { BannerPoster } from '@/src/shared/components/BannerPoster';
import { Header } from '@/src/shared/components/Header';
import { PanelToggle } from '@/src/shared/components/PanelToggle';
import { Footer } from '@/src/shared/components/Footer';
import { createFavorite, deleteFavorite } from '@/src/shared/api/favoriteApi';
import { useQueryClient } from '@tanstack/react-query';
import { useWishlistStore } from '@/src/shared/store/useWishlistStore';
import { getAccessToken, setAccessToken } from '@/src/shared/api/tokenManager';
import { resolveImageSrc } from '@/src/shared/utils/resolveImageSrc';
import { Modal } from '@/src/shared/components/Modal';
import { useTrialCollector } from '@/src/shared/tracking/useTrialCollector';
import { useTargetTracker } from '@/src/shared/tracking/useTargetTracker';
import { isShadowMode } from '@/src/shared/utils/shadowMode';
import { leaveQueue } from '@/src/shared/api/queueApi';
import dynamic from 'next/dynamic';
import { authApi } from '@/src/shared/api/authApi';
import loveAnimation from '@/src/shared/lottle/Love.json';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });
import { useBotDetectionSSE } from '@/src/shared/hooks/useBotDetectionSSE';
import { verifyCaptcha } from '@/src/shared/api/botDetectionApi';
import { ReCaptcha } from '@/src/shared/components/ReCaptcha';
import { isMockLoginEvent } from '@/src/shared/config/mockEventConfig';

const navItems = [
  { id: 'info', title: '공연 정보' },
  { id: 'price', title: '가격 정보' },
  { id: 'schedule', title: '공연 일정' },
  { id: 'details', title: '상세 정보' },
];

const formatDateToDot = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
};

interface DetailViewProps {
  isOverlay?: boolean;
  storyMode?: boolean;
}

export const DetailView = ({ isOverlay = false, storyMode = false }: DetailViewProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedDetailId, setDetailBannerOpen } = useDetailStore();

  const urlId = searchParams?.get('id');
  const activeEventId = selectedDetailId || urlId;

  const scrollRef = useRef<HTMLElement>(null);

  // 페이지 진입 시 스크롤을 항상 최상단으로 초기화
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0); // 혹시 모를 window 레벨의 스크롤도 방어
  }, [activeEventId]);

  const { data, isLoading, isError, error } = useDetailData(activeEventId);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isUpcoming, setIsUpcoming] = useState(false);
  const [isWaitlistUpcoming, setIsWaitlistUpcoming] = useState(false);
  const [isMoreThanOneDayLeft, setIsMoreThanOneDayLeft] = useState(false);
  const [isWaitlistMoreThanOneDayLeft, setIsWaitlistMoreThanOneDayLeft] = useState(false);
  const [flowState, setFlowState] = useState<'NONE' | 'QUEUE' | 'BOOK' | 'WAITLIST_QUEUE' | 'WAITLIST_BOOK'>('NONE');
  const [admitToken, setAdmitToken] = useState<string | null>(null);
  const [queueToken, setQueueToken] = useState<string | null>(null);
  const queueTokenRef = useRef<string | null>(null);
  const flowScopeRef = useRef<'BOOKING' | 'CANCELLATION_WAIT'>('BOOKING');
  const [isBannerFolded, setIsBannerFolded] = useState(false);
  const { wishlistMap, addWishlist, removeWishlist } = useWishlistStore();
  const isFavorite = activeEventId ? !!wishlistMap[activeEventId] : false;
  const [detailImageFailed, setDetailImageFailed] = useState(false);
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title: string; content: string; onConfirm?: () => void; confirmText?: string; showCancelButton?: boolean }>({ isOpen: false, title: '', content: '' });
  const [isMockLoginOpen, setIsMockLoginOpen] = useState(false);
  const [mockLoginName, setMockLoginName] = useState('');
  const [mockLoginPhone, setMockLoginPhone] = useState('');
  const [mockLoginError, setMockLoginError] = useState('');
  const [isMockLoginSubmitting, setIsMockLoginSubmitting] = useState(false);
  const [pendingMockLoginFlow, setPendingMockLoginFlow] = useState<'QUEUE' | 'WAITLIST_QUEUE' | null>(null);
  const queryClient = useQueryClient();
  const [isInvalidAccess, setIsInvalidAccess] = useState(false);
  const [isBackExitModalOpen, setIsBackExitModalOpen] = useState(false);
  const currentStepRef = useRef<string>('detail');
  const [playLoveAnimation, setPlayLoveAnimation] = useState(false);

  // ── 봇 탐지 CAPTCHA 상태 ──────────────────────────────────
  const [showCaptchaOverlay, setShowCaptchaOverlay] = useState(false);
  const [captchaDenied, setCaptchaDenied] = useState(false);

  const { disconnect } = useBotDetectionSSE({
    enabled: flowState !== 'NONE',
    onRetryCaptcha: () => {
      setCaptchaDenied(false);
      setShowCaptchaOverlay(true);
    },
    onSuccessClose: () => {
      setShowCaptchaOverlay(false);
      setCaptchaDenied(false);
    },
    onDenyClose: () => {
      setShowCaptchaOverlay(false);
      setCaptchaDenied(true);
    },
  });

  const handleCaptchaSuccess = useCallback(async (token: string) => {
    try {
      await verifyCaptcha({
        success: true,
        token,
        type: 'CAPTCHA_RETRY',
        eventId: activeEventId ? Number(activeEventId) : undefined,
        createdAt: new Date().toISOString(),
      });
      // SSE에서 SUCCESS_CLOSE를 받으면 자동으로 닫힘
    } catch (e) {
      console.error('[CAPTCHA] verifyCaptcha 호출 실패:', e);
    }
  }, [activeEventId]);

  const handleCaptchaFailure = useCallback(async () => {
    try {
      await verifyCaptcha({
        success: false,
        token: 'captcha-failed',
        type: 'CAPTCHA_RETRY',
        eventId: activeEventId ? Number(activeEventId) : undefined,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[CAPTCHA] verifyCaptcha failure 호출 실패:', e);
    }
  }, [activeEventId]);

  const bookBtnTracker = useTargetTracker({ trackId: 'detail-book-btn', isClickable: !isUpcoming });
  const waitlistBtnTracker = useTargetTracker({ trackId: 'detail-waitlist-btn', isClickable: !isWaitlistUpcoming });

  useEffect(() => {
    const handleLoveAnimation = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.eventId === activeEventId?.toString()) {
        setPlayLoveAnimation(false);
        setTimeout(() => setPlayLoveAnimation(true), 10);
      }
    };
    window.addEventListener('play-love-animation', handleLoveAnimation);
    return () => window.removeEventListener('play-love-animation', handleLoveAnimation);
  }, [activeEventId]);

  // ── Validate state on direct URL access ────────────────
  useEffect(() => {
    const step = searchParams?.get('step');
    if (step === 'pay_method' || step === 'payment' || step === 'seat') {
      const currentSelectedSeats = useBookStore.getState().selectedSeats;
      if (currentSelectedSeats.size === 0 && flowState === 'NONE') {
        setIsInvalidAccess(true);
      }
    }
  }, [searchParams, flowState]);

  const { setStage, finalize } = useTrialCollector({
    enabled: flowState === 'NONE',
    initialStage: 'detail',

    behaviorEvent: {
      eventId: activeEventId ? Number(activeEventId) : null,
      scheduleId: null,
      eventDate: null,
    }
  });

  useEffect(() => {
    setStage('detail');
  }, [setStage]);

  const handleQueueAdmitted = useCallback((token: string, qToken?: string) => {
    setAdmitToken(token);
    if (qToken) {
      setQueueToken(qToken);
      queueTokenRef.current = qToken;
    }
    // 대기열은 한번 넘어가면 뒤로가기로 돌아갈 수 없으므로 queue 엔트리를 book으로 교체
    currentStepRef.current = 'book';
    window.history.replaceState({ tickleStep: 'book' }, '');
    setFlowState((prev) => (prev === 'QUEUE' ? 'BOOK' : 'WAITLIST_BOOK'));
  }, []);

  const continueFlowStart = (state: 'QUEUE' | 'WAITLIST_QUEUE') => {
    // 예매하기(또는 예매/대기열 시작) 버튼을 누르면 지금까지 수집된 DETAIL 데이터 전송
    finalize();

    flowScopeRef.current = state === 'WAITLIST_QUEUE' ? 'CANCELLATION_WAIT' : 'BOOKING';
    setFlowState(state);

    // 뒤로가기 감지를 위해 히스토리 엔트리 추가 (대기열 단계 플래그)
    currentStepRef.current = 'queue';
    window.history.pushState({ tickleStep: 'queue' }, '');
  };

  const handleFlowStart = (state: 'QUEUE' | 'WAITLIST_QUEUE') => {
    if (!storyMode && !isShadowMode(activeEventId) && state === 'QUEUE' && isMockLoginEvent(activeEventId)) {
      setPendingMockLoginFlow(state);
      setMockLoginError('');
      setIsMockLoginOpen(true);
      return;
    }

    if (!storyMode && !getAccessToken() && !isShadowMode(activeEventId)) {
      setModalConfig({
        isOpen: true,
        title: '로그인 필요',
        content: '로그인이 필요한 서비스입니다.',
        confirmText: '로그인 하기',
        showCancelButton: true,
        onConfirm: () => {
          const redirectUrl = `/detail?id=${activeEventId}`;
          window.location.href = `/login?redirect=${encodeURIComponent(redirectUrl)}`;
        }
      });
      return;
    }

    continueFlowStart(state);
  };

  const handleMockLoginSubmit = async () => {
    const name = mockLoginName.trim();
    const phoneNumber = mockLoginPhone.replace(/\D/g, '');

    if (!name) {
      setMockLoginError('이름을 입력해주세요.');
      return;
    }

    if (!/^010\d{8}$/.test(phoneNumber)) {
      setMockLoginError('전화번호는 010으로 시작하는 11자리 숫자로 입력해주세요.');
      return;
    }

    try {
      setIsMockLoginSubmitting(true);
      setMockLoginError('');
      const response = await authApi.mockLogin({ name, phoneNumber });
      setAccessToken(response.data.accessToken);
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] });

      const nextFlow = pendingMockLoginFlow;
      setIsMockLoginOpen(false);
      setPendingMockLoginFlow(null);
      setMockLoginName('');
      setMockLoginPhone('');

      if (nextFlow) {
        continueFlowStart(nextFlow);
      }
    } catch (error: any) {
      setMockLoginError(error?.message || '목업 로그인에 실패했습니다.');
    } finally {
      setIsMockLoginSubmitting(false);
    }
  };

  const flowStateRef = useRef(flowState);
  useEffect(() => {
    flowStateRef.current = flowState;
  }, [flowState]);

  // BookView에서 단계 전환 시 히스토리 엔트리 추가하는 콜백
  const handleBookStepChange = useCallback((step: string) => {
    currentStepRef.current = step;
    window.history.pushState({ tickleStep: step }, '');
  }, []);

  // BookView에서 뒤로가기로 이전 단계로 이동할 때 호출되는 콜백
  const handleBookStepBack = useCallback((targetStep: string) => {
    currentStepRef.current = targetStep;
  }, []);

  // 대기열 활성 상태에서 브라우저 뒤로가기/새로고침 시 leaveQueue 호출
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
        setIsBackExitModalOpen(true);
      } else {
        // 플로우 내 이전 단계로 이동
        currentStepRef.current = targetStep;

        // BookView 내부 단계 간 뒤로가기 처리
        // 각 히스토리 엔트리의 tickleStep 값에 따라 bookingStep을 설정
        const stepMap: Record<string, string> = {
          'seat': 'SEAT',
          'book': 'SEAT',         // book = captcha 통과 후 좌석 선택
          'ticket_type': 'TICKET_TYPE',
          'payment': 'PAYMENT',
          'pay_method': 'PAY_METHOD',
        };
        const bookingStep = stepMap[targetStep];
        if (bookingStep) {
          useBookStore.getState().setBookingStep(bookingStep as any);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeEventId]);

  useEffect(() => {
    if (data && activeEventId) {
      // API에서 받은 상태로 초기화하되, 이미 사용자가 토글한 값이 스토어에 있으면 덮어쓰지 않음
      if (wishlistMap[activeEventId] === undefined) {
        if (data.isFavorite) {
          addWishlist(activeEventId);
        } else {
          removeWishlist(activeEventId);
        }
      }
    }
  }, [data?.isFavorite, activeEventId, wishlistMap, addWishlist, removeWishlist]);

  // 디테일 뷰 진입 시 스크롤 최상단으로 강제 초기화
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    } else {
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTop = 0;
      window.scrollTo(0, 0);
    }
  }, [activeEventId]);

  const handleFavoriteToggle = async () => {
    if (!activeEventId) return;

    if (!storyMode && !getAccessToken() && !isShadowMode(activeEventId)) {
      setModalConfig({
        isOpen: true,
        title: '로그인 필요',
        content: '로그인이 필요한 서비스입니다.',
        confirmText: '로그인 하기',
        showCancelButton: true,
        onConfirm: () => {
          const redirectUrl = `/detail?id=${activeEventId}`;
          window.location.href = `/login?redirect=${encodeURIComponent(redirectUrl)}`;
        }
      });
      return;
    }

    try {
      if (isFavorite) {
        removeWishlist(activeEventId);
      } else {
        addWishlist(activeEventId);
        window.dispatchEvent(new CustomEvent('play-love-animation', { detail: { eventId: activeEventId } }));
      }

      if (isFavorite) {
        await deleteFavorite(activeEventId);
      } else {
        await createFavorite(activeEventId);
      }
      queryClient.invalidateQueries({ queryKey: ['myUpcomingWishlist'] });
    } catch (error: any) {
      console.error('찜 등록/취소 실패:', error);
      if (isFavorite) {
        addWishlist(activeEventId);
      } else {
        removeWishlist(activeEventId);
      }
      if (error.status === 400) {
        setModalConfig({ isOpen: true, title: '잘못된 요청', content: '요청이 올바르지 않습니다.' });
      } else if (error.status === 404) {
        setModalConfig({ isOpen: true, title: '정보 없음', content: '해당 공연이나 찜 내역을 찾을 수 없습니다.' });
      } else if (error.status === 409) {
        setModalConfig({ isOpen: true, title: '이미 등록됨', content: '이미 찜한 공연입니다.' });
      } else {
        setModalConfig({ isOpen: true, title: '오류 발생', content: '처리 중 알 수 없는 오류가 발생했습니다.' });
      }
    }
  };

  // 예매 플로우 진행 중 새로고침/탭 닫기 방지
  useEffect(() => {
    if (flowState === 'NONE') return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // @ts-ignore
      if (window.__isNavigatingToPayment__) return;
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [flowState]);

  useEffect(() => {
    if (data?.openDate) {
      const openTime = new Date(data.openDate).getTime();
      const waitlistOpenTime = data.waitlistOpenDate ? new Date(data.waitlistOpenDate).getTime() : 0;

      const checkTime = () => {
        const now = Date.now();
        setIsUpcoming(openTime > now);
        setIsWaitlistUpcoming(waitlistOpenTime > 0 && waitlistOpenTime > now);
        setIsMoreThanOneDayLeft(openTime - now > 24 * 60 * 60 * 1000);
        setIsWaitlistMoreThanOneDayLeft(waitlistOpenTime > 0 && (waitlistOpenTime - now > 24 * 60 * 60 * 1000));
      };

      checkTime();
      const timer = setInterval(checkTime, 1000);
      return () => clearInterval(timer);
    }
  }, [data?.openDate]);

  const formatOpenDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = days[date.getDay()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}.${day}(${dayOfWeek}) ${hours}:${minutes}`;
  };

  const scheduleData = data?.schedules || [];
  const enabledDates = scheduleData.map((item: any) => item.date.split(' ')[0].replace(/\./g, '-'));
  const selectedDateStr = selectedDate ? formatDateToDot(selectedDate) : '';
  const selectedSchedule = scheduleData.find((item: any) => item.date.startsWith(selectedDateStr));
  const detailImageSrc = resolveImageSrc(data?.detailImageUrl);

  useEffect(() => {
    setDetailImageFailed(false);
  }, [detailImageSrc]);

  // 스크롤 스파이 (Scroll Spy)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = navItems.findIndex((item) => item.id === entry.target.id);
            if (index !== -1) setActiveIndex(index);
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    navItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [isLoading]);

  const handleScrollTo = (id: string, index: number) => {
    setActiveIndex(index);
    const element = document.getElementById(id);
    if (element) {
      // 모바일 중첩 스크롤러(PullToRefresh 등) 환경에서도 안전하게 스크롤되도록 수동 계산
      const getScrollParent = (node: HTMLElement | null): HTMLElement => {
        if (!node) return document.documentElement;
        if (node.scrollHeight > node.clientHeight) {
          const overflowY = window.getComputedStyle(node).overflowY;
          if (overflowY === 'auto' || overflowY === 'scroll') return node;
        }
        return getScrollParent(node.parentElement);
      };

      const scrollParent = getScrollParent(element);
      const isWindow = scrollParent === document.documentElement;

      const elementRect = element.getBoundingClientRect();
      const parentRect = isWindow ? { top: 0 } : scrollParent.getBoundingClientRect();
      const scrollTop = isWindow ? window.pageYOffset : scrollParent.scrollTop;

      const offset = 80; // sticky header offset
      const targetY = elementRect.top - parentRect.top + scrollTop - offset;

      if (isWindow) {
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      } else {
        scrollParent.scrollTo({ top: targetY, behavior: 'smooth' });
      }
    }
  };

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    } else {
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTo({ top: mainEl.scrollHeight, behavior: 'smooth' });
      else window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

  // 에러 발생 시 (예: 404) 스토어를 초기화하여 빈 오버레이에 갇히지 않도록 방어
  useEffect(() => {
    if (isError && isOverlay) {
      useDetailStore.getState().closeDetail();
    }
  }, [isError, isOverlay]);

  if (!activeEventId || isError) {
    if (isOverlay) return null;
    return (
      <div className="flex w-full h-screen items-center justify-center bg-[#f8f8f8] font-sans">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-content">공연 정보를 찾을 수 없습니다</h1>
          <p className="text-content-tertiary">
            {/* @ts-ignore */}
            {isError && (error as any)?.status === 404
              ? '존재하지 않거나 삭제된 공연입니다.'
              : '올바르지 않은 접근이거나 존재하지 않는 공연입니다.'}
          </p>
          <Button color="dark" size="medium" onClick={() => router.push('/')}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  if (isInvalidAccess) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#f8f8f8] gap-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-content">잘못된 접근입니다</h1>
          <p className="text-content-tertiary">
            예매 정보가 만료되었거나 비정상적인 접근입니다.
          </p>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="px-6 py-2.5 bg-content text-white rounded-xl font-bold hover:bg-surface-inverse transition-colors"
          >
            홈으로 가기
          </button>
        </div>
      </div>
    );
  }

  const renderActionButtons = () => (
    <div className="flex items-center gap-3 w-full">
      {/* 예약 버튼 묶음 */}
      <div className="flex items-center flex-1 gap-2">

        {/* 예매하기 버튼 */}
        <Button
          {...bookBtnTracker}
          color="dark"
          size="large"
          className={`flex-1 flex items-center justify-center h-14 !rounded-xl !px-0 transition-all duration-300 shadow-sm ${isUpcoming ? 'opacity-80 pointer-events-none bg-surface-inverse' : ''}`}
          onClick={() => !isUpcoming && handleFlowStart('QUEUE')}
          isLoading={isLoading}
        >
          {isUpcoming && data?.openDate ? (
            isMoreThanOneDayLeft ? (
              <span className="font-bold tracking-wider text-[15px]">{formatOpenDate(data.openDate)}</span>
            ) : (
              <div className="flex items-center justify-center whitespace-nowrap">
                <div className="flex items-center bg-surface/10 rounded-md px-2.5 py-1 border border-white/5 shadow-inner text-white">
                  <CountdownTimer targetDate={data.openDate} onExpire={() => setIsUpcoming(false)} variant="compact" />
                </div>
              </div>
            )
          ) : (
            <span className="font-bold tracking-wider text-[15px]">예매하기</span>
          )}
        </Button>

        {/* 취소표 대기하기 버튼 */}
        <Button
          {...waitlistBtnTracker}
          color="light"
          size="large"
          className={`flex-1 flex items-center justify-center h-14 !rounded-xl !px-0 border border-black/10 transition-all duration-300 shadow-sm overflow-hidden ${isWaitlistUpcoming ? 'bg-surface-subtle opacity-90 pointer-events-none' : ''}`}
          onClick={() => !isWaitlistUpcoming && handleFlowStart('WAITLIST_QUEUE')}
          isLoading={isLoading}
        >
          {isWaitlistUpcoming && data?.openDate ? (
            isWaitlistMoreThanOneDayLeft ? (
              <span className="font-bold tracking-wider text-[15px]">{formatOpenDate(new Date(new Date(data.openDate).getTime() + 10 * 60 * 1000).toISOString())}</span>
            ) : (
              <div className="flex items-center justify-center whitespace-nowrap">
                <div className="flex items-center bg-surface-active/60 rounded-md px-2.5 py-1 border border-line-strong shadow-inner text-content">
                  <CountdownTimer targetDate={new Date(new Date(data.openDate).getTime() + 10 * 60 * 1000).toISOString()} onExpire={() => setIsWaitlistUpcoming(false)} variant="compact" />
                </div>
              </div>
            )
          ) : (
            <span className="font-bold tracking-wider text-[15px]">취소표 대기하기</span>
          )}
        </Button>
      </div>

      {/* 찜하기 버튼 */}
      <button
        onClick={handleFavoriteToggle}
        className={`w-14 h-14 flex items-center justify-center rounded-xl border transition-colors shadow-sm shrink-0 ${isFavorite ? 'border-danger-light bg-danger-subtle' : 'border-line bg-surface hover:bg-surface-subtle'}`}
        aria-label={isFavorite ? '찜 해제' : '찜 추가'}
      >
        {isFavorite ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4444" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
          </svg>
        )}
      </button>
    </div>
  );

  const renderContent = () => (
    <div className="w-full min-h-full pb-20 lg:pb-32 pt-0 lg:pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {/* Mobile/Tablet Header (Transparent Floating) */}
      <div className="lg:hidden fixed top-0 left-0 z-[60] p-4 pointer-events-none">
        <button
          onClick={() => {
            if (isOverlay) {
              useDetailStore.getState().closeDetail();
            } else {
              router.push('/');
            }
          }}
          className="w-10 h-10 flex items-center justify-center text-white bg-black/20 hover:bg-black/30 backdrop-blur-md rounded-full transition-colors pointer-events-auto shadow-sm"
          aria-label="뒤로 가기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {/* Mobile/Tablet Hero Poster (Hidden on Desktop) */}
      <div className="w-[100vw] ml-[calc(50%-50vw)] h-[40vh] min-h-[300px] sm:h-[400px] md:h-[380px] lg:hidden mb-6 relative shrink-0">
        <BannerPoster
          src={data?.imageUrl || ''}
          alt="Detail Banner"
          isLoading={isLoading}
          width="100%"
          height="100%"
          showGradient={false}
          className="w-full h-full rounded-none"
        >
          {/* 하트 애니메이션 (상단 오버레이 레이어 - Mobile) */}
          {playLoveAnimation && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
              <Lottie
                animationData={loveAnimation}
                loop={false}
                onComplete={() => setPlayLoveAnimation(false)}
                className="w-[60%] max-w-[300px] h-auto"
              />
            </div>
          )}
          {/* 포스터 하단 그라데이션 오버레이 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        </BannerPoster>
      </div>

      {/* Hero Section */}
      <section className="max-w-2xl lg:mt-3 flex flex-col items-start px-2 lg:px-0">
        <Title
          title={data?.title || ''}
          textColor="black"
          className="!bg-transparent [&>div]:!p-0 !text-3xl sm:!text-4xl md:!text-5xl lg:[&_h1]:!text-6xl [&_h1]:!font-serif [&_h1]:!tracking-tight [&_h1]:!leading-[1.15] [&_h1]:whitespace-pre-line"
          bottomBorder={false}
          isLoading={isLoading}
        />

        <div className="flex flex-col gap-1.5 mt-4 sm:mt-5">
          <BannerSubtitle subtitle={data?.subTitle || ''} color="black" className="!text-sm sm:!text-base md:!text-[17px] opacity-80" isLoading={isLoading} />
          <BannerPlace place={data?.venue || ''} color="black" className="!text-sm sm:!text-base md:!text-[17px] font-bold" isLoading={isLoading} />
          <BannerTime time={data?.startDate ? `${data?.startDate} ~ ${data?.endDate}` : ''} color="black" className="!text-sm sm:!text-base md:!text-[17px] opacity-90" isLoading={isLoading} />
        </div>

        <div className="flex flex-col gap-3 mt-8 w-full max-w-[540px]">
          {/* 예약 버튼 그룹 + 찜하기 버튼 */}
          {renderActionButtons()}
        </div>
      </section>

      {/* Content Section with Sticky Timeline */}
      <section className="mt-16 flex flex-col gap-8 border-t border-black/10 relative items-start">
        <div className="sticky top-0 z-40 w-full bg-[#f8f8f8]/95 backdrop-blur-md py-3 lg:py-4 px-4 lg:px-0 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.05)] lg:shadow-none">
          <div className="w-full max-w-3xl mx-auto">
            <SectionNav
              items={navItems}
              activeIndex={activeIndex}
              onItemClick={(id: string, index: number) => handleScrollTo(id, index)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-8 w-full max-w-3xl mx-auto">
          {/* 1. 공연 정보 */}
          <div id="info" className="scroll-mt-48 w-full">
            <Box variant="flat" padding="medium" className="w-full border border-black/5">
              <div className="flex flex-col items-start gap-4">
                <Title title="공연 정보" bottomBorder={true} className="!px-0 !pt-0 !pb-4 mb-1 w-full [&>div]:!px-0 [&_h1]:!text-xl" />
                <div className="flex flex-col gap-6 w-full">
                  {[
                    { title: '장소', descriptions: [data?.venue || '', data?.venueAddress || ''] },
                    { title: '공지사항', descriptions: data?.notice?.split('\n') || [] }
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-1.5">
                      <Text typography="t6" fontWeight="bold" color="primary">{item.title}</Text>
                      <div className="flex flex-col gap-0.5">
                        {item.descriptions.map((desc, dIdx) => desc && (
                          <Text key={dIdx} typography="t6" color="secondary">{desc}</Text>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Box>
          </div>

          <div className="flex flex-col gap-8 w-full">
            {/* 2. 가격 */}
            <div id="price" className="scroll-mt-48 transition-all duration-500 ease-in-out w-full">
              <Box variant="flat" padding="large" className="w-full border border-black/5 flex flex-col gap-4 shadow-sm bg-surface rounded-2xl">
                <Title title="가격 정보" bottomBorder={false} className="!px-0 !pt-0 !pb-2 mb-0 w-full [&>div]:!px-0 [&_h1]:!text-2xl shrink-0" />
                <div className="w-full rounded-xl overflow-hidden border border-line-subtle">
                  <Table
                    columns={[
                      {
                        key: 'seat',
                        header: '좌석 등급',
                        align: 'left',
                        render: (row: any) => {
                          const gradeColors: Record<string, string> = {
                            'VIP': 'var(--seat-vip-top)',
                            'R': 'var(--seat-r-top)',
                            'S': 'var(--seat-s-top)',
                            'A': 'var(--seat-a-top)',
                          };
                          return (
                            <div className="flex items-center gap-3">
                              <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: gradeColors[row.priceGrade] || 'var(--color-surface-active)' }} />
                              <Text typography="t5" fontWeight="bold" color="primary">{row.priceGrade}</Text>
                            </div>
                          );
                        }
                      },
                      {
                        key: 'price',
                        header: '가격',
                        align: 'right',
                        render: (row: any) => (
                          <Text typography="t5" fontWeight="medium" color="primary">{row.price.toLocaleString()}원</Text>
                        )
                      },
                    ]}
                    data={data?.zonePrices || []}
                  />
                </div>
              </Box>
            </div>

            {/* 3. 공연 일정 */}
            <div id="schedule" className="scroll-mt-48 transition-all duration-500 ease-in-out w-full">
              <Box variant="flat" padding="medium" className="w-full border border-black/5">
                <div className="flex flex-col items-start gap-4 w-full">
                  <Title title="공연 일정" bottomBorder={true} className="!px-0 !pt-0 !pb-4 mb-1 w-full [&>div]:!px-0 [&_h1]:!text-xl shrink-0" />
                  <div className="flex flex-col gap-8 w-full mt-2">
                    <div className="w-full flex justify-center">
                      <Calendar
                        enabledDates={enabledDates}
                        selectedDate={selectedDate ? formatDateToDot(selectedDate).replace(/\./g, '-') : null}
                        onSelect={(date) => {
                          setSelectedDate(date ? new Date(date) : null);
                        }}
                      />
                    </div>

                    <div className="w-full">
                      {selectedSchedule ? (
                        <div className="flex flex-col gap-4">
                          <Text typography="t5" fontWeight="bold" color="primary">선택하신 날짜의 회차</Text>
                          <div className="flex flex-wrap gap-3">
                            {selectedSchedule.times.map((timeObj: any, idx: number) => (
                              <div
                                key={idx}
                                className="inline-flex flex-col items-center justify-center px-6 py-3 border border-line rounded-xl bg-surface"
                              >
                                <Text typography="t4" fontWeight="bold" color="primary">{timeObj.time}</Text>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-32 border border-dashed border-line-strong rounded-xl bg-surface-subtle/50">
                          <Text typography="t6" color="tertiary">관람하실 날짜를 캘린더에서 선택해주세요.</Text>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Box>
            </div>
          </div>

          {/* 4. 상세 정보 */}
          <div id="details" className="scroll-mt-48 w-full mt-8">
            <Box variant="flat" padding="medium" className="w-full border border-black/5 bg-surface-subtle flex flex-col items-center justify-center min-h-[500px] overflow-hidden rounded-xl">
              {detailImageSrc && !detailImageFailed ? (
                <Image
                  src={detailImageSrc}
                  alt="상세 정보"
                  width={0}
                  height={0}
                  sizes="100vw"
                  style={{ width: '100%', height: 'auto' }}
                  className="w-full h-auto object-cover rounded-xl"
                  unoptimized={true}
                  onError={() => setDetailImageFailed(true)}
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-content-muted">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <Text typography="t5" color="secondary">상세 이미지 준비 중입니다</Text>
                </div>
              )}
            </Box>
          </div>

        </div>
      </section>

      {/* Booking Pipeline Overlays */}
      {(flowState === 'QUEUE' || flowState === 'WAITLIST_QUEUE') && (
        <div className="fixed inset-0 z-[70] bg-surface overflow-y-auto">
          <QueueView
            eventId={activeEventId ? activeEventId.toString() : (data?.eventId?.toString() ?? '')}
            scope={flowState === 'WAITLIST_QUEUE' ? 'CANCELLATION_WAIT' : 'BOOKING'}
            onAdmitted={handleQueueAdmitted}
            onClose={() => {
              setFlowState('NONE');
              queueTokenRef.current = null;
              setQueueToken(null);
            }}
            onTokenFetched={(token) => {
              queueTokenRef.current = token;
              setQueueToken(token);
            }}
            storyMode={storyMode}
          />
        </div>
      )}
      {(flowState === 'BOOK' || flowState === 'WAITLIST_BOOK') && (
        <div className="fixed inset-0 z-[70] bg-surface overflow-y-auto">
          <BookView
            eventId={activeEventId}
            mode={flowState === 'WAITLIST_BOOK' ? 'WAITLIST' : 'BOOK'}
            admitToken={admitToken || undefined}
            onClose={() => {
              setFlowState('NONE');
              queueTokenRef.current = null;
              setQueueToken(null);
            }}
            onLeaveQueue={() => {
              if (queueTokenRef.current && activeEventId) {
                leaveQueue(activeEventId, queueTokenRef.current, flowScopeRef.current).catch(() => { });
                queueTokenRef.current = null;
                setQueueToken(null);
              }
            }}
            onStepChange={handleBookStepChange}
            onStepBack={handleBookStepBack}
            storyMode={storyMode}
            onPaymentStart={disconnect}
          />
        </div>
      )}

      {/* 뒤로가기 경고 모달 */}
      <Modal
        isOpen={isBackExitModalOpen}
        onClose={() => setIsBackExitModalOpen(false)}
        onConfirm={() => {
          setIsBackExitModalOpen(false);
          // 모달 확인 시 실제로 대기열 이탈 및 플로우 종료
          if (queueTokenRef.current && activeEventId) {
            leaveQueue(activeEventId, queueTokenRef.current, flowScopeRef.current).catch(() => { });
            queueTokenRef.current = null;
            setQueueToken(null);
          }
          currentStepRef.current = 'detail';
          setFlowState('NONE');
          // pushState로 추가된 히스토리 엔트리를 정리 (뒤로가기 실행)
          // flowState를 NONE으로 설정했으므로 popstate 핸들러가 무시함
          window.history.back();
        }}
        title="예매를 종료하시겠습니까?"
        description="현재 진행 중인 예매/대기가 취소됩니다. 정말 나가시겠습니까?"
        confirmText="나가기"
        showCancelButton={true}
      />

      <Modal
        isOpen={isMockLoginOpen}
        onClose={() => {
          if (isMockLoginSubmitting) return;
          setIsMockLoginOpen(false);
          setPendingMockLoginFlow(null);
          setMockLoginError('');
        }}
        onConfirm={handleMockLoginSubmit}
        title="이벤트 참여용 로그인"
        description="상품 지급을 위해 이름과 전화번호를 입력해주세요"
        confirmText="계속하기"
        cancelText="취소"
        showCancelButton={true}
        isLoading={isMockLoginSubmitting}
        isConfirmDisabled={isMockLoginSubmitting}
        className="max-w-[360px]"
      >
        <div className="w-full flex flex-col gap-3 mt-2 text-left">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-content">
            이름
            <input
              value={mockLoginName}
              onChange={(e) => setMockLoginName(e.target.value)}
              className="h-11 rounded-xl border border-line bg-surface px-3 text-[15px] font-medium outline-none focus:border-primary"
              placeholder="김싸피"
              maxLength={12}
              disabled={isMockLoginSubmitting}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-content">
            전화번호
            <input
              value={mockLoginPhone}
              onChange={(e) => setMockLoginPhone(e.target.value)}
              className="h-11 rounded-xl border border-line bg-surface px-3 text-[15px] font-medium outline-none focus:border-primary"
              placeholder="01012345678"
              inputMode="numeric"
              disabled={isMockLoginSubmitting}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleMockLoginSubmit();
                }
              }}
            />
          </label>
          {mockLoginError && (
            <p className="text-sm font-medium text-danger">{mockLoginError}</p>
          )}
        </div>
      </Modal>

      {/* 에러 모달 */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onConfirm={() => {
          setModalConfig({ ...modalConfig, isOpen: false });
          if (modalConfig.onConfirm) modalConfig.onConfirm();
        }}
        title={modalConfig.title}
        description={modalConfig.content}
        confirmText={modalConfig.confirmText || '확인'}
        showCancelButton={modalConfig.showCancelButton ?? false}
      />

      {/* 봇 탐지 CAPTCHA 오버레이 */}
      {showCaptchaOverlay && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-[440px] mx-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <ReCaptcha
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY as string}
              theme="light"
              title="보안 검증이 필요합니다"
              description="봇이 아닌지 확인하기 위해 아래 인증을 완료해 주세요."
              buttonText="인증 완료"
              showButton={true}
              onSuccess={handleCaptchaSuccess}
              onError={handleCaptchaFailure}
              onExpire={handleCaptchaFailure}
              onConfirm={handleCaptchaSuccess}
            />
          </div>
        </div>
      )}

      {/* CAPTCHA 실패(DENY_CLOSE) 안내 모달 */}
      <Modal
        isOpen={captchaDenied}
        onClose={() => {
          setCaptchaDenied(false);
          setFlowState('NONE');
          queueTokenRef.current = null;
          setQueueToken(null);
        }}
        onConfirm={() => {
          setCaptchaDenied(false);
          setFlowState('NONE');
          queueTokenRef.current = null;
          setQueueToken(null);
        }}
        title="보안 검증 실패"
        description="CAPTCHA 인증에 실패하여 예매를 진행할 수 없습니다. 다시 시도해 주세요."
        confirmText="확인"
        showCancelButton={false}
      />
    </div>
  );

  const renderScrollButtons = () => (
    <div className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 flex flex-col gap-3 z-[100]">
      <button
        onClick={scrollToTop}
        className="w-12 h-12 flex items-center justify-center bg-surface/90 backdrop-blur-sm border border-line rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:bg-surface transition-all text-content-tertiary hover:text-primary group"
        aria-label="맨 위로"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-y-0.5 transition-transform"><polyline points="18 15 12 9 6 15"></polyline></svg>
      </button>
      <button
        onClick={scrollToBottom}
        className="w-12 h-12 flex items-center justify-center bg-surface/90 backdrop-blur-sm border border-line rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:bg-surface transition-all text-content-tertiary hover:text-primary group"
        aria-label="맨 아래로"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-y-0.5 transition-transform"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>
    </div>
  );

  if (isOverlay) {
    return (
      <>
        {renderContent()}
        {flowState === 'NONE' && renderScrollButtons()}
      </>
    );
  }

  return (
    <div className="flex w-full h-screen bg-[#f8f8f8] font-sans overflow-hidden relative">
      <aside
        className={`hidden lg:block h-full relative transition-[width,min-width,opacity] duration-500 ease-in-out overflow-hidden shrink-0 ${isBannerFolded ? 'w-0 min-w-0 opacity-0' : 'w-2/5 min-w-[40%] opacity-100'
          }`}
      >
        <div className="w-[40vw] h-full">
          <BannerPoster
            src={data?.imageUrl || ''}
            alt="Detail Banner"
            isLoading={isLoading}
            width="100%"
            height="100%"
            showGradient={false}
            className="rounded-none md:rounded-none max-w-full"
          >
            <div className="flex flex-col justify-between h-full p-4"></div>
          </BannerPoster>
        </div>
      </aside>

      <PanelToggle
        isFolded={isBannerFolded}
        onToggle={() => setIsBannerFolded(!isBannerFolded)}
      />

      <main
        ref={scrollRef}
        className="flex-1 min-w-0 h-full flex flex-col px-6 pt-0 pb-12 md:px-10 md:pb-16 overflow-y-auto transition-all duration-500 relative [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-surface-inverse [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-content"
      >
        <div className="hidden lg:block">
          <Header />
        </div>

        <div className="flex-1 w-full min-w-0">
          {renderContent()}
        </div>

        <Footer />
      </main>

      {/* Floating Scroll Buttons */}
      {flowState === 'NONE' && renderScrollButtons()}
    </div>
  );
};
