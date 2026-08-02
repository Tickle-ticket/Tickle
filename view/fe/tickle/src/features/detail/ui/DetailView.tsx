'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BannerSubtitle } from '@/src/shared/components/BannerSubtitle';
import { BannerPlace } from '@/src/shared/components/BannerPlace';
import Button from '@/src/shared/components/Button';
import { DetailContentSection } from '@/src/features/detail/ui/components/DetailContentSection';
import { useDetailDataWithFixtures } from '@/src/features/detail/api/useDetailDataWithFixtures';
import { useDetailStore } from '@/src/shared/store/useDetailStore';
import { useBookStore } from '@/src/features/book/store/useBookStore';
import { BannerPoster } from '@/src/shared/components/BannerPoster';
import { Header } from '@/src/shared/components/Header';
import { PanelToggle } from '@/src/shared/components/PanelToggle';
import { Footer } from '@/src/shared/components/Footer';
import { useQueryClient } from '@tanstack/react-query';
import { useWishlistStore } from '@/src/shared/store/useWishlistStore';
import { useFavoriteToggle } from '@/src/features/favorite/api/useFavoriteToggle';
import { getAccessToken } from '@/src/shared/api/tokenManager';
import { Modal } from '@/src/shared/components/Modal';
import { useTrialCollector } from '@/src/shared/tracking/useTrialCollector';
import { useTargetTracker } from '@/src/shared/tracking/useTargetTracker';
import { createDetailFlowPolicy } from '../api/detailFlowPolicy';
import { useEventFlowStart } from '@/src/features/detail/hooks/useEventFlowStart';
import { useBookingFlow } from '@/src/features/detail/hooks/useBookingFlow';
import { useOpenSchedule } from '@/src/features/detail/hooks/useOpenSchedule';
import { useSectionNav } from '@/src/features/detail/hooks/useSectionNav';
import { useCaptchaGate } from '@/src/features/detail/hooks/useCaptchaGate';
import { ScrollToButtons } from '@/src/features/detail/ui/components/ScrollToButtons';
import { DetailActionButtons } from '@/src/features/detail/ui/components/DetailActionButtons';
import { CaptchaGate } from '@/src/features/detail/ui/components/CaptchaGate';
import { DetailHeroSection } from '@/src/features/detail/ui/components/DetailHeroSection';
import { BookingFlowOverlay } from '@/src/features/detail/ui/components/BookingFlowOverlay';



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
  const { activeIndex, scrollToSection } = useSectionNav(navItems, !isLoading);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const {
    isUpcoming,
    isMoreThanOneDayLeft,
    isWaitlistUpcoming,
    isWaitlistMoreThanOneDayLeft,
  } = useOpenSchedule(data?.openDate, data?.waitlistOpenDate);
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

  const {
    showOverlay: showCaptchaOverlay,
    isDenied: captchaDenied,
    handleSuccess: handleCaptchaSuccess,
    handleFailure: handleCaptchaFailure,
    dismissDenied: dismissCaptchaDenied,
    disconnect,
  } = useCaptchaGate({ activeEventId, enabled: flowState !== 'NONE' });

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
    <DetailActionButtons
      openDate={data?.openDate}
      isUpcoming={isUpcoming}
      isMoreThanOneDayLeft={isMoreThanOneDayLeft}
      isWaitlistUpcoming={isWaitlistUpcoming}
      isWaitlistMoreThanOneDayLeft={isWaitlistMoreThanOneDayLeft}
      isFavorite={isFavorite}
      isLoading={isLoading}
      bookBtnTracker={bookBtnTracker}
      waitlistBtnTracker={waitlistBtnTracker}
      onStartBooking={() => handleFlowStart('QUEUE')}
      onStartWaitlist={() => handleFlowStart('WAITLIST_QUEUE')}
      onToggleFavorite={handleFavoriteToggle}
    />
  );

  const renderContent = () => (
    <div className="w-full min-h-full pb-20 lg:pb-32 pt-0 lg:pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <DetailHeroSection
        data={data}
        isLoading={isLoading}
        playLoveAnimation={playLoveAnimation}
        onLoveAnimationEnd={() => setPlayLoveAnimation(false)}
        onBack={() => {
          if (isOverlay) {
            useDetailStore.getState().closeDetail();
          } else {
            router.push('/');
          }
        }}
        actionButtons={renderActionButtons()}
      />

      <DetailContentSection
        data={data}
        navItems={navItems}
        activeIndex={activeIndex}
        handleScrollTo={scrollToSection}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
      />

      <BookingFlowOverlay
        flowState={flowState}
        eventId={activeEventId ?? data?.eventId?.toString()}
        admitToken={admitToken}
        onQueueAdmitted={handleQueueAdmitted}
        onTokenFetched={updateQueueToken}
        onExit={() => exitFlow({ notifyServer: false })}
        onLeaveQueue={leaveQueueOnly}
        onStepChange={handleBookStepChange}
        onStepBack={handleBookStepBack}
        onPaymentStart={disconnect}
      />

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

      <CaptchaGate
        isOpen={showCaptchaOverlay}
        isDenied={captchaDenied}
        onSuccess={handleCaptchaSuccess}
        onFailure={handleCaptchaFailure}
        onDenyClose={() => {
          dismissCaptchaDenied();
          // 봇 판정으로 끊긴 경우라 서버에 이탈을 따로 알리지 않는다.
          exitFlow({ notifyServer: false });
        }}
      />
    </div>
  );

  if (isOverlay) {
    return (
      <>
        {renderContent()}
        {flowState === 'NONE' && <ScrollToButtons scrollRef={scrollRef} />}
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
      {flowState === 'NONE' && <ScrollToButtons scrollRef={scrollRef} />}
    </div>
  );
};
