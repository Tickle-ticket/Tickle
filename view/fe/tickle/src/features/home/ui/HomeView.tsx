'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useHomeBanners, useHomeRanking, useHomeUpcoming } from '@/src/features/home/api/useHomeData';
import { http } from '@/src/shared/api/http';
import { createFavorite, deleteFavorite } from '@/src/shared/api/favoriteApi';
import { BannerPoster } from '@/src/shared/components/BannerPoster';
import { BannerTitle } from '@/src/shared/components/BannerTitle';
import { BannerPlace } from '@/src/shared/components/BannerPlace';
import { BannerTime } from '@/src/shared/components/BannerTime';
import { BannerNavigation } from '@/src/shared/components/BannerNavigation';
import { PanelToggle } from '@/src/shared/components/PanelToggle';
import { Header } from '@/src/shared/components/Header';
import Tab from '@/src/shared/components/Tab';
import { InfoCard } from '@/src/shared/components/InfoCard';
import { Title } from '@/src/shared/components/Title';
import { Box } from '@/src/shared/components/Box';
import { useSearchStore } from '@/src/shared/store/useSearchStore';
import { SearchContent } from '@/src/shared/components/SearchContent';

const TAB_ITEMS = ['전체', '뮤지컬', '콘서트', '연극', '전시/행사'];

/** 스크롤 상태 관리 훅 (ResizeObserver 제거 — 카운트다운 깜빡임 방지) */
const useCarouselScroll = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // 초기 체크 + 스크롤 이벤트만 리슨 (ResizeObserver 제거)
    const timer = setTimeout(checkScroll, 100);
    el.addEventListener('scroll', checkScroll, { passive: true });
    return () => { clearTimeout(timer); el.removeEventListener('scroll', checkScroll); };
  }, [checkScroll]);

  const scroll = useCallback((dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;

    // scroll-snap이 걸려있을 때 100%를 이동하면 브라우저에 따라 제자리로 튕기는(snapping back) 버그가 있습니다.
    // 이를 방지하고 자연스럽게 이전/다음 카드로 넘어가도록 이동 거리를 80%로 조정합니다.
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  }, []);

  return { scrollRef, canScrollLeft, canScrollRight, scroll };
};

/** 타이틀 옆 네비게이션 화살표 */
const CarouselNav = ({ canLeft, canRight, onPrev, onNext }: {
  canLeft: boolean; canRight: boolean; onPrev: () => void; onNext: () => void;
}) => (
  <div className="flex items-center gap-1.5 ml-auto">
    <button
      onClick={onPrev}
      disabled={!canLeft}
      className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all duration-150 ${canLeft
        ? 'border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400 active:scale-90'
        : 'border-gray-200 text-gray-250 cursor-default'
        }`}
      aria-label="이전"
    >
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
    </button>
    <button
      onClick={onNext}
      disabled={!canRight}
      className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all duration-150 ${canRight
        ? 'border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400 active:scale-90'
        : 'border-gray-200 text-gray-250 cursor-default'
        }`}
      aria-label="다음"
    >
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  </div>
);

export const HomeView = () => {
  const router = useRouter();
  const { data: banners, isLoading: bannersLoading } = useHomeBanners();
  const { data: upcoming, isLoading: upcomingLoading } = useHomeUpcoming();
  const { searchValue, setSearchValue } = useSearchStore();

  const [isBannerFolded, setIsBannerFolded] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());

  const categoryId = activeTab === 0 ? undefined : activeTab;
  const { data: ranking, isLoading: rankingLoading } = useHomeRanking(categoryId);

  const rankingCarousel = useCarouselScroll();
  const upcomingCarousel = useCarouselScroll();

  const totalBanners = banners?.length || 0;

  const goNext = useCallback(() => {
    if (totalBanners > 0) {
      setCurrentBanner((prev) => (prev + 1) % totalBanners);
    }
  }, [totalBanners]);

  const goPrev = useCallback(() => {
    if (totalBanners > 0) {
      setCurrentBanner((prev) => (prev - 1 + totalBanners) % totalBanners);
    }
  }, [totalBanners]);

  useEffect(() => {
    if (totalBanners <= 1) return;
    const timer = setInterval(goNext, 5000);
    return () => clearInterval(timer);
  }, [totalBanners, goNext]);

  const activeBanner = banners?.[currentBanner];

  const handleCardClick = (eventId: string) => {
    router.push(`/detail?id=${eventId}`);
  };

  const handleWishlistToggle = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    try {
      if (wishlistedIds.has(eventId)) {
        await deleteFavorite(eventId);
      } else {
        await createFavorite(eventId);
      }
      setWishlistedIds((prev) => {
        const next = new Set(prev);
        if (next.has(eventId)) {
          next.delete(eventId);
        } else {
          next.add(eventId);
        }
        return next;
      });
    } catch (error) {
      console.error('찜 등록/취소 실패:', error);
    }
  };

  return (
    <div className="flex w-full h-screen bg-[#f8f8f8] font-sans overflow-hidden relative">

      {/* Left Column: 배너 슬라이드 */}
      <aside
        className={`hidden lg:block h-full relative transition-[width,min-width,opacity] duration-500 ease-in-out overflow-hidden shrink-0 ${isBannerFolded || !!searchValue ? 'w-0 min-w-0 opacity-0' : 'w-2/5 min-w-[40%] opacity-100'
          }`}
      >
        <div className="w-[40vw] h-full relative">
          <BannerPoster
            src={activeBanner?.imageUrl || ''}
            alt="Home Banner"
            isLoading={bannersLoading}
            width="100%"
            height="100%"
            showGradient={true}
            className="rounded-none md:rounded-none max-w-full"
          >
            <div className="flex flex-col justify-between h-full p-4">
              {totalBanners > 1 && (
                <div className="flex justify-end w-full">
                  <BannerNavigation
                    variant="badge"
                    current={currentBanner + 1}
                    total={totalBanners}
                    onNext={goNext}
                    onPrev={goPrev}
                    isLoading={bannersLoading}
                  />
                </div>
              )}
              <div className="mt-auto w-full max-w-4xl flex flex-col items-start gap-1">
                <BannerTitle title={activeBanner?.title || ''} isLoading={bannersLoading} />
                <BannerPlace place={activeBanner?.venue || ''} isLoading={bannersLoading} />
                <BannerTime time={activeBanner?.date || ''} isLoading={bannersLoading} />
              </div>
            </div>
          </BannerPoster>
        </div>
      </aside>

      {/* Right Column: Main Content */}
      <main className="flex-1 h-full flex flex-col px-6 pt-0 pb-12 md:px-10 md:pb-16 overflow-y-auto transition-all duration-500 relative scrollbar-hide [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

        <Header />

        {/* 검색 중일 때: 홈 컨텐츠 대신 검색 결과 렌더링 */}
        {searchValue ? (
          <SearchContent query={searchValue} />
        ) : (
          <>
            {/* Section 1: 랭킹 */}
            <section className="mt-4">
              <div className="flex items-center mb-4">
                <Title
                  title="인기 랭킹"
                  bottomBorder={false}
                  className="!bg-transparent [&>div]:!p-0 !text-2xl [&_h1]:!text-2xl"
                />
              </div>

              {/* Tab Menu + 화살표 */}
              <div className="flex items-center mb-6">
                <Tab onChange={setActiveTab} size="large">
                  {TAB_ITEMS.map((item, idx) => (
                    <Tab.Item key={item} selected={activeTab === idx}>
                      {item}
                    </Tab.Item>
                  ))}
                </Tab>
                <CarouselNav
                  canLeft={rankingCarousel.canScrollLeft}
                  canRight={rankingCarousel.canScrollRight}
                  onPrev={() => rankingCarousel.scroll('left')}
                  onNext={() => rankingCarousel.scroll('right')}
                />
              </div>

              {/* 카드 */}
              <div
                ref={rankingCarousel.scrollRef}
                className="flex gap-5 overflow-x-auto pb-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {rankingLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <div key={idx} className="shrink-0">
                      <InfoCard src="" title="" isLoading={true} showRank={true} rank={idx + 1} />
                    </div>
                  ))
                ) : (
                  ranking?.map((item, idx) => {
                    const isWishlisted = wishlistedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className="shrink-0 cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                        onClick={() => handleCardClick(item.id)}
                      >
                        <InfoCard
                          src={item.imageUrl}
                          title={item.title}
                          place={item.venue}
                          day={item.date}
                          rank={idx + 1}
                          showRank={true}
                          isWishlisted={isWishlisted}
                          onWishlistToggle={(e) => handleWishlistToggle(e, item.id)}
                          badges={item.badges.map((b) => ({
                            text: b,
                            color: b === 'HOT' ? 'red' : b === 'NEW' ? 'green' : b === 'BEST' ? 'blue' : 'grey' as any,
                            variant: 'fill' as const,
                          }))}
                        />
                      </div>
                    );
                  })
                )}
              </div>

              {/* 더보기 */}
              <div className="w-full flex items-center gap-4 mt-6">
                <span className="flex-1 h-px bg-gray-200" />
                <button
                  onClick={() => setSearchValue(TAB_ITEMS[activeTab])}
                  className="group cursor-pointer"
                >
                  <Box variant="outline" padding="none" className="py-2 px-5 hover:bg-gray-50 transition-colors flex items-center justify-center">
                    <span className="text-sm text-gray-500 group-hover:text-gray-800 transition-colors whitespace-nowrap font-medium">
                      더보기
                    </span>
                  </Box>
                </button>
                <span className="flex-1 h-px bg-gray-200" />
              </div>
            </section>

            {/* Section 2: 오픈 예정 */}
            <section className="mt-16 pb-32">
              <div className="flex items-center mb-6">
                <Title
                  title="오픈 예정"
                  bottomBorder={false}
                  className="!bg-transparent [&>div]:!p-0 !text-2xl [&_h1]:!text-2xl"
                />
                <CarouselNav
                  canLeft={upcomingCarousel.canScrollLeft}
                  canRight={upcomingCarousel.canScrollRight}
                  onPrev={() => upcomingCarousel.scroll('left')}
                  onNext={() => upcomingCarousel.scroll('right')}
                />
              </div>

              {/* 카드 */}
              <div
                ref={upcomingCarousel.scrollRef}
                className="flex gap-5 overflow-x-auto pb-4 pt-5 px-1 -mx-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {upcomingLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <div key={idx} className="shrink-0">
                      <InfoCard src="" title="" isLoading={true} showTime={true} />
                    </div>
                  ))
                ) : (
                  upcoming?.map((item) => {
                    const isWishlisted = wishlistedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className="shrink-0 relative cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                        onClick={() => handleCardClick(item.id)}
                      >
                        <InfoCard
                          src={item.imageUrl}
                          title={item.title}
                          place={item.venue}
                          day={item.date}
                          disabled={true}
                          showTime={true}
                          targetDate={item.openDate}
                          isWishlisted={isWishlisted}
                          onWishlistToggle={(e) => handleWishlistToggle(e, item.id)}
                          badges={item.badges.map((b) => ({
                            text: b,
                            color: b === 'HOT' ? 'red' : b === 'NEW' ? 'green' : b === 'BEST' ? 'blue' : 'grey' as any,
                            variant: 'fill' as const,
                          }))}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};
