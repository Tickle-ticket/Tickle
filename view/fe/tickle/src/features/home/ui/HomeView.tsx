'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
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
import { Footer } from '@/src/shared/components/Footer';
import Tab from '@/src/shared/components/Tab';
import { InfoCard } from '@/src/shared/components/InfoCard';
import { Title } from '@/src/shared/components/Title';
import { Box } from '@/src/shared/components/Box';
import { useSearchStore } from '@/src/shared/store/useSearchStore';
import { SearchContent } from '@/src/shared/components/SearchContent';
import { useMypageStore } from '@/src/shared/store/useMypageStore';
import { MyPageContent } from '@/src/features/mypage/ui/MyPageContent';
import { useDetailStore } from '@/src/shared/store/useDetailStore';
import { useDetailData } from '@/src/features/detail/api/useDetailData';
import { DetailContent } from '@/src/features/detail/ui/DetailContent';

const TAB_ITEMS = ['전체', '뮤지컬', '콘서트', '연극', '전시/행사'];

const useCarouselScroll = () => {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, [el]);

  useEffect(() => {
    if (!el) return;
    // 초기 체크 + 스크롤 이벤트 리슨
    const timer = setTimeout(checkScroll, 100);
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll); // 리사이즈 대비
    return () => { 
      clearTimeout(timer); 
      el.removeEventListener('scroll', checkScroll); 
      window.removeEventListener('resize', checkScroll);
    };
  }, [el, checkScroll]);

  const scroll = useCallback((dir: 'left' | 'right') => {
    if (!el) return;
    // scroll-snap 버그 방지 및 자연스러운 이동을 위해 80% 이동
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  }, [el]);

  return { scrollRef: setEl, canScrollLeft, canScrollRight, scroll };
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
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const sectionVariants: Variants = {
  hidden: { x: -30, opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  },
  exit: { 
    x: 30, 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

export const HomeView = () => {
  const router = useRouter();
  const { data: banners, isLoading: bannersLoading } = useHomeBanners();
  const { data: upcoming, isLoading: upcomingLoading } = useHomeUpcoming();
  const { searchValue, setSearchValue } = useSearchStore();
  const { isMypageOpen } = useMypageStore();

  const [isBannerFolded, setIsBannerFolded] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());

  const categoryId = activeTab === 0 ? undefined : activeTab;
  const { data: ranking, isLoading: rankingLoading } = useHomeRanking(categoryId);

  const rankingCarousel = useCarouselScroll();
  const upcomingCarousel = useCarouselScroll();

  const { selectedDetailId, isDetailBannerOpen, openDetail, closeDetail, clickedLayoutId } = useDetailStore();
  const { data: detailData, isLoading: detailLoading } = useDetailData(selectedDetailId || undefined);

  useEffect(() => {
    // 1초마다 배너 자동 전환
    if (banners?.length && !isBannerFolded && !searchValue && !isMypageOpen && !selectedDetailId) {
      const timer = setInterval(() => {
        setCurrentBanner((prev) => (prev + 1) % (banners?.length || 1));
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [banners?.length, isBannerFolded, searchValue, isMypageOpen, selectedDetailId]);

  // 검색, 마이페이지 진입 시 배너 자동 접힘. 홈이나 디테일 진입 시 자동 열림.
  useEffect(() => {
    if (searchValue || isMypageOpen) {
      setIsBannerFolded(true);
    } else {
      setIsBannerFolded(false);
    }
  }, [searchValue, isMypageOpen, selectedDetailId]);

  // 임시: 컴포넌트 마운트 시 전체 찜 목록 조회 (실제로는 API 혹은 Global State 연동 필요)
  useEffect(() => {
    http.get<{ content: any[] }>('/api/v1/favorites').then(res => {
      const ids = new Set<string>();
      res.content.forEach((item) => ids.add(String(item.eventId)));
      setWishlistedIds(ids);
    }).catch(err => {
      // API 실패 시 무시
    });
  }, []);

  const totalBanners = banners?.length || 0;
  const activeBanner = selectedDetailId && isDetailBannerOpen 
    ? { imageUrl: detailData?.imageUrl || '', title: detailData?.title || '', venue: detailData?.venue || '', date: detailData?.startDate || '' } 
    : banners?.[currentBanner];

  const goNext = () => setCurrentBanner((prev) => (prev + 1) % (totalBanners || 1));
  const goPrev = () => setCurrentBanner((prev) => (prev - 1 + (totalBanners || 1)) % (totalBanners || 1));

  const handleCardClick = (eventId: string, layoutId?: string) => {
    openDetail(eventId, layoutId);
  };

  const handleWishlistToggle = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    try {
      const isWishlisted = wishlistedIds.has(eventId);
      if (isWishlisted) {
        await deleteFavorite(Number(eventId));
      } else {
        await createFavorite(Number(eventId));
      }

      setWishlistedIds(prev => {
        const next = new Set(prev);
        if (isWishlisted) {
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
        className={`hidden lg:block h-full relative transition-[width,min-width,opacity] duration-500 ease-in-out overflow-hidden shrink-0 ${
          isBannerFolded
            ? 'w-0 min-w-0 opacity-0' 
            : 'w-2/5 min-w-[40%] opacity-100'
          }`}
      >
        <motion.div 
          className={`w-[40vw] h-full relative origin-center ${!selectedDetailId && activeBanner && 'id' in activeBanner ? 'cursor-pointer' : ''}`}
          layoutId={clickedLayoutId || "main-banner"}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          onClick={() => {
            if (!selectedDetailId && activeBanner && 'id' in activeBanner) {
              handleCardClick(String(activeBanner.id), "main-banner");
            }
          }}
        >
          <BannerPoster
            src={activeBanner?.imageUrl || ''}
            alt="Home Banner"
            isLoading={bannersLoading || (!!selectedDetailId && detailLoading)}
            width="100%"
            height="100%"
            showGradient={!selectedDetailId} // 디테일 배너는 그라디언트 없이 원본 표시
            className="rounded-none md:rounded-none max-w-full"
          >
            <div className="flex flex-col justify-between h-full p-4">
              {/* 우측 상단: 썸네일 리스트만 렌더링 */}
              {totalBanners > 1 && !selectedDetailId && (
                <div className="flex justify-end w-full">
                  <div className="hidden lg:flex items-center gap-2">
                    {banners?.map((b, idx) => (
                      <button
                        key={b.id || idx}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setCurrentBanner(idx); 
                        }}
                        className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all duration-300 shadow-md ${
                          currentBanner === idx 
                            ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)] z-10' 
                            : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'
                        }`}
                        aria-label={`${idx + 1}번 배너로 이동`}
                      >
                        <img 
                          src={b.imageUrl} 
                          alt={b.title || `Banner ${idx + 1}`} 
                          className="w-full h-full object-cover" 
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 하단: 타이틀 등 정보 표시 */}
              {!selectedDetailId && (
                <div className="mt-auto w-full max-w-4xl flex flex-col items-start gap-1">
                  <BannerTitle title={activeBanner?.title || ''} isLoading={bannersLoading} />
                  <BannerPlace place={activeBanner?.venue || ''} isLoading={bannersLoading} />
                  <BannerTime time={activeBanner?.date || ''} isLoading={bannersLoading} />
                </div>
              )}
            </div>
          </BannerPoster>
        </motion.div>
      </aside>

      {/* Toggle Button */}
      <PanelToggle 
        isFolded={isBannerFolded} 
        onToggle={() => setIsBannerFolded(!isBannerFolded)} 
      />

      {/* Right Column: Main Content */}
      <main className="flex-1 min-w-0 h-full flex flex-col px-6 pt-0 pb-12 md:px-10 md:pb-16 overflow-y-auto transition-all duration-500 relative scrollbar-hide [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

        <Header />

        {/* 검색 중일 때: 홈 컨텐츠 대신 검색 결과 렌더링 */}
        <AnimatePresence mode="wait">
          {searchValue ? (
            <motion.div key="search" variants={sectionVariants} initial="hidden" animate="visible" exit="exit" className="flex-1 w-full min-w-0">
              <SearchContent query={searchValue} />
            </motion.div>
          ) : isMypageOpen ? (
            <motion.div key="mypage" variants={sectionVariants} initial="hidden" animate="visible" exit="exit" className="flex-1 w-full min-w-0">
              <MyPageContent />
            </motion.div>
          ) : selectedDetailId ? (
            <motion.div key="detail" variants={sectionVariants} initial="hidden" animate="visible" exit="exit" className="flex-1 w-full min-w-0">
              <DetailContent />
            </motion.div>
          ) : (
            <motion.div key="home" variants={sectionVariants} initial="hidden" animate="visible" exit="exit" className="flex-1 w-full min-w-0 flex flex-col">
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
                        onClick={() => handleCardClick(item.id, `poster-ranking-${item.id}`)}
                      >
                        <InfoCard
                          layoutId={`poster-ranking-${item.id}`}
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
                  upcoming?.map((item, idx) => {
                    const isWishlisted = wishlistedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className="shrink-0 relative cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                        onClick={() => handleCardClick(item.id, `poster-upcoming-${item.id}`)}
                      >
                        <InfoCard
                          layoutId={`poster-upcoming-${item.id}`}
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* 전역 푸터 (하단 스크롤 시 모든 뷰에서 등장) */}
        <Footer />
      </main>
    </div>
  );
};
