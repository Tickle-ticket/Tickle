'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useHomeBanners, useHomeRanking, useHomeUpcoming, useHomeCategories } from '@/src/features/home/api/useHomeData';
import { http } from '@/src/shared/api/http';
import { getFavoriteEvents, createFavorite, deleteFavorite } from '@/src/shared/api/favoriteApi';
import { useQueryClient } from '@tanstack/react-query';
import { getAccessToken } from '@/src/shared/api/tokenManager';
import { BannerPoster } from '@/src/shared/components/BannerPoster';
import { BannerTitle } from '@/src/shared/components/BannerTitle';
import { BannerPlace } from '@/src/shared/components/BannerPlace';
import { BannerTime } from '@/src/shared/components/BannerTime';
import { BannerNavigation } from '@/src/shared/components/BannerNavigation';
import { PanelToggle } from '@/src/shared/components/PanelToggle';
import { Header } from '@/src/shared/components/Header';
import { MobileBottomNav } from '@/src/shared/components/MobileBottomNav';
import { PullToRefresh } from '@/src/shared/components/PullToRefresh';
import { Footer } from '@/src/shared/components/Footer';
import Tab from '@/src/shared/components/Tab';
import { InfoCard } from '@/src/shared/components/InfoCard';
import { Title } from '@/src/shared/components/Title';
import { Box } from '@/src/shared/components/Box';
import { useSearchStore } from '@/src/shared/store/useSearchStore';
import { SearchContent } from '@/src/shared/components/SearchContent';
import { useMypageStore } from '@/src/shared/store/useMypageStore';
import { useWishlistStore } from '@/src/shared/store/useWishlistStore';
import { MyPageContent } from '@/src/features/mypage/ui/MyPageContent';
import { Modal } from '@/src/shared/components/Modal';
import { useDetailStore } from '@/src/shared/store/useDetailStore';
import { useDetailData } from '@/src/features/detail/api/useDetailData';
import { DetailView } from '@/src/features/detail/ui/DetailView';



const useCarouselScroll = () => {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (!node) return;
    setCanScrollLeft(node.scrollLeft > 4);
    const maxScroll = node.scrollWidth - node.clientWidth;
    setCanScrollRight(maxScroll > 0 && node.scrollLeft < maxScroll - 4);
  }, [node]);

  useEffect(() => {
    if (!node) return;
    // 초기 체크 + 스크롤 및 리사이즈 이벤트 리슨
    const timer = setTimeout(checkScroll, 100);
    node.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      node.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [node, checkScroll]);

  const scroll = useCallback((dir: 'left' | 'right') => {
    if (!node) return;

    // scroll-snap이 걸려있을 때 100%를 이동하면 브라우저에 따라 제자리로 튕기는(snapping back) 버그가 있습니다.
    // 이를 방지하고 자연스럽게 이전/다음 카드로 넘어가도록 이동 거리를 80%로 조정합니다.
    const amount = node.clientWidth * 0.8;
    node.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  }, [node]);

  return { scrollRef: setNode, canScrollLeft, canScrollRight, scroll };
};

const CarouselNav = ({ canLeft, canRight, onPrev, onNext }: {
  canLeft: boolean; canRight: boolean; onPrev: () => void; onNext: () => void;
}) => (
  <div className="hidden md:flex items-center gap-1.5 ml-auto">
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
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 }
  }
};



const ThumbnailImage = ({ src, alt }: { src: string; alt: string }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="w-full h-full bg-white" />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover bg-white"
      onError={() => setHasError(true)}
    />
  );
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

  const { wishlistMap, initWishlist, addWishlist, removeWishlist } = useWishlistStore();
  const queryClient = useQueryClient();

  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title: string; content: string; onConfirm?: () => void; confirmText?: string; showCancelButton?: boolean }>({ isOpen: false, title: '', content: '' });

  const { data: categoryList, isLoading: categoriesLoading } = useHomeCategories();
  const tabItems = ['전체', ...(categoryList?.map(c => c.categoryName) || [])];

  const categoryId = activeTab === 0 ? undefined : categoryList?.[activeTab - 1]?.categoryId;
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

  // 로그인된 사용자만 찜 목록을 조회 (비로그인 시 불필요한 401 에러 및 강제 리디렉트 방지)
  useEffect(() => {
    if (!getAccessToken()) return;
    getFavoriteEvents().then(res => {
      const ids: string[] = [];
      if (res.data?.items) {
        res.data.items.forEach((item) => ids.push(String(item.eventId)));
      }
      initWishlist(ids);
    }).catch(err => {
      // API 실패 시 무시 (토큰 만료 등)
    });
  }, []);

  const totalBanners = banners?.length || 0;
  const activeBanner = selectedDetailId && isDetailBannerOpen
    ? { id: selectedDetailId, imageUrl: detailData?.imageUrl || '', title: detailData?.title || '', venue: detailData?.venue || '', date: detailData?.startDate || '', subtitle: '' }
    : banners?.[currentBanner];

  const goNext = () => setCurrentBanner((prev) => (prev + 1) % (totalBanners || 1));
  const goPrev = () => setCurrentBanner((prev) => (prev - 1 + (totalBanners || 1)) % (totalBanners || 1));

  const handleCardClick = (eventId: string, layoutId?: string) => {
    openDetail(eventId, layoutId);
  };

  const handleWishlistToggle = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();

    if (!getAccessToken()) {
      setModalConfig({
        isOpen: true,
        title: '로그인 필요',
        content: '로그인이 필요한 서비스입니다.',
        confirmText: '로그인 하기',
        showCancelButton: true,
        onConfirm: () => { 
          const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login?redirect=${currentPath}`; 
        }
      });
      return;
    }

    const isWishlisted = !!wishlistMap[eventId];

    // Optimistic UI Update: 먼저 UI를 즉각적으로 변경하여 반응성을 높입니다.
    if (isWishlisted) {
      removeWishlist(eventId);
    } else {
      addWishlist(eventId);
    }

    try {
      if (isWishlisted) {
        await deleteFavorite(Number(eventId));
      } else {
        await createFavorite(Number(eventId));
      }
      queryClient.invalidateQueries({ queryKey: ['myUpcomingWishlist'] });
    } catch (error: any) {
      console.error('찜 등록/취소 실패:', error);

      // 이미 백엔드에서 찜 해제되어 있는 경우 ('찾을 수 없습니다' 에러)
      // 우리의 낙관적 업데이트(UI에서 해제)가 결과적으로 맞았으므로 롤백하지 않습니다.
      const isAlreadyDeleted = isWishlisted && error?.message?.includes('찾을 수 없습니다');

      if (!isAlreadyDeleted) {
        // 그 외의 진짜 에러 발생 시 원래 상태로 롤백 (Revert)
        if (isWishlisted) {
          addWishlist(eventId);
        } else {
          removeWishlist(eventId);
        }
      }
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['homeBanners'] }),
      queryClient.invalidateQueries({ queryKey: ['homeRanking'] }),
      queryClient.invalidateQueries({ queryKey: ['homeUpcoming'] })
    ]);
  };

  return (
    <div className="w-full h-[100dvh] overflow-hidden bg-[#f8f8f8]">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="flex flex-col lg:flex-row w-full h-auto min-h-[100dvh] lg:h-[100dvh] bg-[#f8f8f8] font-sans relative">

          {/* Left Column: 배너 슬라이드 */}
      <aside
        className={`relative transition-[width,height,min-width,opacity] duration-300 ease-in-out shrink-0 ${isBannerFolded
          ? 'hidden lg:block lg:w-0 lg:min-w-0 opacity-0'
          : selectedDetailId
            ? 'hidden lg:block lg:h-full lg:w-2/5 lg:min-w-[40%] opacity-100'
            : 'w-full h-[28vh] min-h-[220px] md:h-[35vh] lg:h-full lg:w-2/5 lg:min-w-[40%] opacity-100'
          }`}
      >
        <div className="w-full h-full overflow-hidden">
        <motion.div
          className={`w-full lg:w-[40vw] h-full relative origin-center ${!selectedDetailId && activeBanner?.id ? 'cursor-pointer' : ''}`}
          layoutId={clickedLayoutId || "main-banner"}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          onClick={() => {
            if (!selectedDetailId && activeBanner?.id) {
              handleCardClick(activeBanner.id, "main-banner");
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
                        key={`${b.id}-${idx}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentBanner(idx);
                        }}
                        className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all duration-300 shadow-md ${currentBanner === idx
                          ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)] z-10'
                          : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'
                          }`}
                        aria-label={`${idx + 1}번 배너로 이동`}
                      >
                        <ThumbnailImage
                          src={b.imageUrl}
                          alt={b.subtitle?.replace(' 랭킹 1위', '') || b.title || `Banner ${idx + 1}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 하단: 타이틀 등 정보 표시 */}
              {!selectedDetailId && (
                <div className="mt-auto w-full max-w-4xl flex flex-col items-start gap-1 pb-2">
                  {'subtitle' in (activeBanner || {}) && (activeBanner as any).subtitle && (
                    <span className="inline-flex items-center rounded bg-blue-600/90 px-2 py-0.5 text-[11px] md:text-xs font-bold tracking-wider text-white mb-1 shadow-sm">
                      {(activeBanner as any).subtitle}
                    </span>
                  )}
                  <BannerTitle title={activeBanner?.title || ''} isLoading={bannersLoading} />
                  <BannerPlace place={activeBanner?.venue || ''} isLoading={bannersLoading} />
                  <BannerTime time={activeBanner?.date || ''} isLoading={bannersLoading} />
                </div>
              )}
            </div>
          </BannerPoster>
        </motion.div>
        </div>
      </aside>

      {/* Toggle Button - flex 형제로 배치하여 aside 너비에 자연스럽게 따라감 */}
      {!searchValue && !isMypageOpen && (
        <div className={`hidden lg:flex shrink-0 items-center z-50 ${isBannerFolded ? '' : '-ml-6'}`}>
          <PanelToggle
            isFolded={isBannerFolded}
            onToggle={() => setIsBannerFolded(!isBannerFolded)}
          />
        </div>
      )}

      {/* Right Column: Main Content */}
      <main className={`flex-1 min-w-0 flex flex-col px-4 pt-0 pb-24 md:px-8 md:pb-10 lg:px-10 lg:pb-16 lg:h-full lg:overflow-y-auto transition-all duration-500 relative ${selectedDetailId ? '' : 'scrollbar-hide [&::-webkit-scrollbar]:hidden'}`} style={selectedDetailId ? {} : { scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

        <div className="hidden lg:block">
          <Header />
        </div>

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
              <DetailView isOverlay={true} />
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
                    {tabItems.map((item, idx) => (
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
                  className="overflow-x-auto pb-4 pt-2 px-2 -mx-2"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="flex gap-5 min-w-max"
                    >
                      {rankingLoading ? (
                        Array.from({ length: 5 }).map((_, idx) => (
                          <div key={`skeleton-${idx}`} className="shrink-0">
                            <InfoCard src="" title="" isLoading={true} showRank={true} rank={idx + 1} />
                          </div>
                        ))
                      ) : !ranking || ranking.length === 0 ? (
                        <div className="flex-1 w-full flex flex-col items-center justify-center py-16 px-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 mx-2 shrink-0">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-3">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="9" y1="15" x2="15" y2="15"></line>
                          </svg>
                          <p className="text-gray-500 font-medium text-sm sm:text-base">현재 진행 중인 인기 공연이 없습니다.</p>
                          <p className="text-gray-400 text-xs sm:text-sm mt-1">곧 새로운 공연이 업데이트될 예정입니다.</p>
                        </div>
                      ) : (
                        ranking?.map((item, idx) => {
                          const isWishlisted = !!wishlistMap[item.id];
                          return (
                            <div
                              key={item.id}
                              className="shrink-0 relative cursor-pointer hover:scale-[1.02] hover:z-10 transition-all duration-200"
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
                                badges={item.badges}
                                priority={idx < 3}
                              />
                            </div>
                          );
                        })
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* 더보기 */}
                <div className="w-full flex items-center gap-4 mt-6">
                  <span className="flex-1 h-px bg-gray-200" />
                  <button
                    onClick={() => setSearchValue(tabItems[activeTab])}
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
                  className="flex gap-5 overflow-x-auto pb-4 pt-5 px-2 -mx-2"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {upcomingLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <div key={idx} className="shrink-0">
                        <InfoCard src="" title="" isLoading={true} showTime={true} />
                      </div>
                    ))
                  ) : !upcoming || upcoming.length === 0 ? (
                    <div className="flex-1 w-full flex flex-col items-center justify-center py-16 px-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 mx-2 shrink-0">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-3">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <p className="text-gray-500 font-medium text-sm sm:text-base">현재 오픈 예정인 공연이 없습니다.</p>
                      <p className="text-gray-400 text-xs sm:text-sm mt-1">새로운 공연 소식을 기다려주세요!</p>
                    </div>
                  ) : (
                    upcoming?.map((item, idx) => {
                      const isWishlisted = !!wishlistMap[item.id];
                      return (
                        <div
                          key={item.id}
                          className="shrink-0 relative cursor-pointer hover:scale-[1.02] hover:z-10 transition-all duration-200"
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
                            badges={item.badges}
                            priority={idx < 3}
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

        {/* 알림 모달 */}
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

        {/* 전역 푸터 (하단 스크롤 시 모든 뷰에서 등장) */}
        <Footer />
      </main>
      </div>
      </PullToRefresh>
      {!selectedDetailId && <MobileBottomNav />}
    </div>
  );
};
