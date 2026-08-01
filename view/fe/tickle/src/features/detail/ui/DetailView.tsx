'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Title } from '@/src/shared/components/Title';
import { BannerSubtitle } from '@/src/shared/components/BannerSubtitle';
import { BannerPlace } from '@/src/shared/components/BannerPlace';
import { BannerTime } from '@/src/shared/components/BannerTime';
import Button from '@/src/shared/components/Button';
import { Badge } from '@/src/shared/components/Badge';
import { DetailContentSection } from '@/src/features/detail/ui/components/DetailContentSection';
import { BookButton } from '@/src/shared/components/BookButton';
import { WaitlistButton } from '@/src/shared/components/WaitlistButton';
import { useDetailDataWithFixtures } from '@/src/features/detail/api/useDetailDataWithFixtures';
import { useDetailStore } from '@/src/shared/store/useDetailStore';
import { useBookStore } from '@/src/features/book/store/useBookStore';
import { BookView } from '@/src/features/book/ui/BookView';
import { QueueView } from '@/src/features/queue/ui/QueueView';
import { BannerPoster } from '@/src/shared/components/BannerPoster';
import { Header } from '@/src/shared/components/Header';
import { PanelToggle } from '@/src/shared/components/PanelToggle';
import { Footer } from '@/src/shared/components/Footer';
import { useQueryClient } from '@tanstack/react-query';
import { useWishlistStore } from '@/src/shared/store/useWishlistStore';
import { useFavoriteToggle } from '@/src/features/favorite/api/useFavoriteToggle';
import { getAccessToken, clearTokens } from '@/src/shared/api/tokenManager';
import { Modal } from '@/src/shared/components/Modal';
import { useTrialCollector } from '@/src/shared/tracking/useTrialCollector';
import { useTargetTracker } from '@/src/shared/tracking/useTargetTracker';
import { createDetailFlowPolicy } from '../api/detailFlowPolicy';
import { navigateToBlocked } from '@/src/shared/utils/blockedNavigation';
import dynamic from 'next/dynamic';
import { useBotDetectionSSE } from '@/src/shared/hooks/useBotDetectionSSE';
import { verifyCaptcha } from '@/src/shared/api/botDetectionApi';
import { ReCaptcha } from '@/src/shared/components/ReCaptcha';
import { useEventFlowStart } from '@/src/features/detail/hooks/useEventFlowStart';
import { useBookingFlow } from '@/src/features/detail/hooks/useBookingFlow';
import loveAnimation from '@/src/shared/lottle/Love.json';

const Lottie = dynamic(() => import('lottie-react').then((mod) => mod.default || mod), { ssr: false });


const navItems = [
  { id: 'info', title: '공연 정보' },
  { id: 'price', title: '가격 정보' },
  { id: 'schedule', title: '공연 일정' },
  { id: 'details', title: '상세 정보' },
];

interface DetailViewProps {
  isOverlay?: boolean;
}

export const DetailView = ({ isOverlay = false }: DetailViewProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedDetailId, setDetailBannerOpen } = useDetailStore();

  const urlId = searchParams?.get('id');
  const activeEventId = selectedDetailId || urlId;

  // Storybook은 MSW 핸들러로 실제 조회 흐름을 그대로 태우므로 예외를 두지 않는다.
  const detailPolicy = createDetailFlowPolicy(activeEventId);

  const scrollRef = useRef<HTMLElement>(null);

  // 페이지 진입 시 스크롤을 항상 최상단으로 초기화
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0); // 혹시 모를 window 레벨의 스크롤도 방어
  }, [activeEventId]);

  // error 객체는 구독하지 않는다 — 403·404·5xx는 throwOnError로 Error Boundary가 처리하고,
  // 여기서는 오버레이를 닫기 위한 isError 신호만 필요하다.
  const { data, isLoading, isError } = useDetailDataWithFixtures(activeEventId);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isUpcoming, setIsUpcoming] = useState(false);
  const [isWaitlistUpcoming, setIsWaitlistUpcoming] = useState(false);
  const [isMoreThanOneDayLeft, setIsMoreThanOneDayLeft] = useState(false);
  const [isWaitlistMoreThanOneDayLeft, setIsWaitlistMoreThanOneDayLeft] = useState(false);
  const [isBackExitModalOpen, setIsBackExitModalOpen] = useState(false);
  const handleBackAttempt = useCallback(() => setIsBackExitModalOpen(true), []);

  const {
    flowState,
    admitToken,
    startFlow,
    exitFlow,
    leaveQueueOnly,
    handleQueueAdmitted,
    updateQueueToken,
    handleBookStepChange,
    handleBookStepBack,
  } = useBookingFlow({ activeEventId, onBackAttempt: handleBackAttempt });

  const [isBannerFolded, setIsBannerFolded] = useState(false);
  const { wishlistMap, addWishlist, removeWishlist } = useWishlistStore();

  const { toggle: toggleFavorite } = useFavoriteToggle({
    // 상세 화면은 찜을 새로 누를 때 하트 애니메이션을 띄운다.
    onAdded: (eventId) =>
      window.dispatchEvent(new CustomEvent('play-love-animation', { detail: { eventId } })),
    onError: () =>
      setModalConfig({
        isOpen: true,
        title: '오류 발생',
        content: '찜 상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      }),
  });
  const isFavorite = activeEventId ? !!wishlistMap[activeEventId] : false;
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title: string; content: string; onConfirm?: () => void; confirmText?: string; showCancelButton?: boolean }>({ isOpen: false, title: '', content: '' });
  const queryClient = useQueryClient();
  const [isInvalidAccess, setIsInvalidAccess] = useState(false);
  const [playLoveAnimation, setPlayLoveAnimation] = useState(false);

  // ── 봇 탐지 CAPTCHA 상태 ──────────────────────────────────
  const [showCaptchaOverlay, setShowCaptchaOverlay] = useState(false);
  const [captchaDenied, setCaptchaDenied] = useState(false);
  const [captchaRecordId, setCaptchaRecordId] = useState<string>('');

  const { disconnect } = useBotDetectionSSE({
    enabled: flowState !== 'NONE',
    onRetryCaptcha: (recordId: string) => {
      setCaptchaRecordId(recordId);
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
    onBotBlocked: () => {
      // 즉시 강제 로그아웃 (토큰 삭제) 후 차단 안내 페이지로 이동
      clearTokens();
      navigateToBlocked('blacklist');
    },
  });

  const handleCaptchaSuccess = useCallback(async (token: string) => {
    try {
      await verifyCaptcha({
        recordId: captchaRecordId,
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
  }, [activeEventId, captchaRecordId]);

  const handleCaptchaFailure = useCallback(async () => {
    try {
      await verifyCaptcha({
        recordId: captchaRecordId,
        success: false,
        token: 'captcha-failed',
        type: 'CAPTCHA_RETRY',
        eventId: activeEventId ? Number(activeEventId) : undefined,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[CAPTCHA] verifyCaptcha failure 호출 실패:', e);
    }
  }, [activeEventId, captchaRecordId]);

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

  const { handleFlowStart } = useEventFlowStart({
    activeEventId,
    policy: detailPolicy,
    continueFlowStart: startFlow,
    setModalConfig,
    finalize
  });

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

    if (detailPolicy.requiresLogin && !getAccessToken()) {
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

    // shadow 공연은 서버에 레코드가 없어 찜 API를 타지 않는다. 화면 상태만 뒤집는다.
    if (detailPolicy.skipsServerCalls) {
      if (isFavorite) {
        removeWishlist(activeEventId);
      } else {
        addWishlist(activeEventId);
        window.dispatchEvent(new CustomEvent('play-love-animation', { detail: { eventId: activeEventId } }));
      }
      return;
    }

    await toggleFavorite(activeEventId, isFavorite);
  };


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

      // 1초 간격으로 일반 표시 업데이트
      const timer = setInterval(checkTime, 1000);

      // openTime 도달 시 즉시 활성화하는 정밀 타이머
      const timeUntilOpen = openTime - Date.now();
      let openTimeout: ReturnType<typeof setTimeout> | null = null;
      if (timeUntilOpen > 0) {
        openTimeout = setTimeout(checkTime, timeUntilOpen);
      }

      // waitlistOpenTime 도달 시 즉시 활성화
      const timeUntilWaitlist = waitlistOpenTime - Date.now();
      let waitlistTimeout: ReturnType<typeof setTimeout> | null = null;
      if (waitlistOpenTime > 0 && timeUntilWaitlist > 0) {
        waitlistTimeout = setTimeout(checkTime, timeUntilWaitlist);
      }

      return () => {
        clearInterval(timer);
        if (openTimeout) clearTimeout(openTimeout);
        if (waitlistTimeout) clearTimeout(waitlistTimeout);
      };
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

  // 403·404·5xx는 QueryProvider의 throwOnError가 Error Boundary로 올려보내
  // ApiErrorView가 상태 코드와 서버 메시지를 표시한다(여기서 개별 처리하지 않음).
  // 아래는 eventId 자체가 없는 경우 — 쿼리가 실행되지 않아 에러도 발생하지 않는다.
  if (!activeEventId) {
    if (isOverlay) return null;
    return (
      <div className="flex w-full h-screen items-center justify-center bg-[#f8f8f8] font-sans">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-content">공연 정보를 찾을 수 없습니다</h1>
          <p className="text-content-tertiary">
            올바르지 않은 접근이거나 존재하지 않는 공연입니다.
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
        <BookButton
          trackerProps={bookBtnTracker}
          isUpcoming={isUpcoming}
          isMoreThanOneDayLeft={isMoreThanOneDayLeft}
          targetDate={data?.openDate || undefined}
          onTimerExpire={() => setIsUpcoming(false)}
          onClick={() => !isUpcoming && handleFlowStart('QUEUE')}
          isLoading={isLoading}
        />

        {/* 취소표 대기하기 버튼 */}
        <WaitlistButton
          trackerProps={waitlistBtnTracker}
          isUpcoming={isWaitlistUpcoming}
          isMoreThanOneDayLeft={isWaitlistMoreThanOneDayLeft}
          targetDate={data?.openDate ? new Date(new Date(data.openDate).getTime() + 10 * 60 * 1000).toISOString() : undefined}
          onTimerExpire={() => setIsWaitlistUpcoming(false)}
          onClick={() => !isWaitlistUpcoming && handleFlowStart('WAITLIST_QUEUE')}
          isLoading={isLoading}
        />

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
      <section className="w-full lg:mt-3 flex flex-col items-start px-2 lg:px-0">
        <div className="flex w-full flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className={`flex w-full max-w-full flex-col items-start`}>
            <Title
              title={data?.title || ''}
              textColor="black"
              className="!bg-transparent [&>div]:!p-0 !text-3xl sm:!text-4xl md:!text-5xl lg:[&_h1]:!text-6xl [&_h1]:!font-serif [&_h1]:!tracking-tight [&_h1]:!leading-[1.15] [&_h1]:whitespace-pre-line"
              bottomBorder={false}
              isLoading={isLoading}
            />

            {(data?.subTitle || (data?.tags && data.tags.length > 0)) && (
              <div className="flex flex-wrap gap-2 mt-4 sm:mt-5">
                {data?.subTitle && (
                  <Badge variant="fill" color="grey" size="medium" className="px-3 py-1 font-bold shadow-sm bg-black/5 border-none ring-0">
                    {data.subTitle}
                  </Badge>
                )}
                {data?.tags?.map((tag, idx) => {
                  const displayTag = tag.startsWith('#') ? tag.slice(1) : tag;
                  return (
                    <Badge key={idx} variant="fill" color="grey" size="medium" className="px-3 py-1 font-bold shadow-sm bg-black/5 border-none ring-0">
                      {displayTag}
                    </Badge>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-1.5 mt-3 sm:mt-4">
              <BannerTime time={data?.startDate ? `${data?.startDate} ~ ${data?.endDate}` : ''} color="black" className="!text-sm sm:!text-base md:!text-[17px] opacity-90" isLoading={isLoading} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-8 w-full max-w-[540px]">
          {/* 예약 버튼 그룹 + 찜하기 버튼 */}
          {renderActionButtons()}
        </div>
      </section>

      <DetailContentSection
        data={data}
        navItems={navItems}
        activeIndex={activeIndex}
        handleScrollTo={handleScrollTo}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
      />

      {/* Booking Pipeline Overlays */}
      {(flowState === 'QUEUE' || flowState === 'WAITLIST_QUEUE') && (
        <div className="fixed inset-0 z-[70] bg-surface overflow-y-auto">
          <QueueView
            eventId={activeEventId ? activeEventId.toString() : (data?.eventId?.toString() ?? '')}
            scope={flowState === 'WAITLIST_QUEUE' ? 'CANCELLATION_WAIT' : 'BOOKING'}
            onAdmitted={handleQueueAdmitted}
            onClose={() => exitFlow({ notifyServer: false })}
            onTokenFetched={updateQueueToken}
          />
        </div>
      )}
      {(flowState === 'BOOK' || flowState === 'WAITLIST_BOOK') && (
        <div className="fixed inset-0 z-[70] bg-surface overflow-y-auto">
          <BookView
            eventId={activeEventId}
            mode={flowState === 'WAITLIST_BOOK' ? 'WAITLIST' : 'BOOK'}
            admitToken={admitToken || undefined}
            onClose={() => exitFlow({ notifyServer: false })}
            onLeaveQueue={leaveQueueOnly}
            onStepChange={handleBookStepChange}
            onStepBack={handleBookStepBack}
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
          exitFlow();
          // pushState로 추가된 히스토리 엔트리를 정리 (뒤로가기 실행)
          // flowState를 NONE으로 설정했으므로 popstate 핸들러가 무시함
          window.history.back();
        }}
        title="예매를 종료하시겠습니까?"
        description="현재 진행 중인 예매/대기가 취소됩니다. 정말 나가시겠습니까?"
        confirmText="나가기"
        showCancelButton={true}
      />


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
          // 봇 판정으로 끊긴 경우라 서버에 이탈을 따로 알리지 않는다.
          exitFlow({ notifyServer: false });
        }}
        onConfirm={() => {
          setCaptchaDenied(false);
          // 봇 판정으로 끊긴 경우라 서버에 이탈을 따로 알리지 않는다.
          exitFlow({ notifyServer: false });
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
        {detailPolicy.showsGlobalHeader && (
          <div className="hidden lg:block">
            <Header />
          </div>
        )}

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
