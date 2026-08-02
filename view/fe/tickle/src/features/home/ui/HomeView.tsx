"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useDeferredValue,
} from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useHomeBanners,
  useHomeRanking,
  useHomeUpcoming,
  useHomeCategories,
} from "@/src/features/home/api/useHomeData";
import { http } from "@/src/shared/api/http";
import { getFavoriteEvents } from "@/src/shared/api/favoriteApi";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/src/shared/api/tokenManager";
import { getAccessTokenRoles } from "@/src/shared/api/tokenClaims";
import { useAuth } from "@/src/shared/providers/AuthProvider";
import { BannerPoster } from "@/src/shared/components/BannerPoster";
import { BannerTitle } from "@/src/shared/components/BannerTitle";
import { BannerPlace } from "@/src/shared/components/BannerPlace";
import { BannerTime } from "@/src/shared/components/BannerTime";
import { BannerNavigation } from "@/src/shared/components/BannerNavigation";
import { PanelToggle } from "@/src/shared/components/PanelToggle";
import { Header } from "@/src/shared/components/Header";
import { MobileBottomNav } from "@/src/shared/components/MobileBottomNav";
import { PullToRefresh } from "@/src/shared/components/PullToRefresh";
import { Footer } from "@/src/shared/components/Footer";
import { SearchContent } from "@/src/shared/components/SearchContent";
import { useMypageStore } from "@/src/shared/store/useMypageStore";
import { useWishlistStore } from "@/src/shared/store/useWishlistStore";
import { useFavoriteToggle } from "@/src/features/favorite/api/useFavoriteToggle";
import { MyPageContent } from "@/src/features/mypage/ui/MyPageContent";
import { Modal } from "@/src/shared/components/Modal";
import { useDetailStore } from "@/src/shared/store/useDetailStore";
import { useDetailDataWithFixtures } from "@/src/features/detail/api/useDetailDataWithFixtures";
import { DetailView } from "@/src/features/detail/ui/DetailView";
import dynamic from "next/dynamic";
import loveAnimation from "@/src/shared/lottle/Love.json";
import { ThumbnailImage } from "@/src/features/home/ui/components/ThumbnailImage";
import { HomeRankingSection } from "@/src/features/home/ui/components/HomeRankingSection";
import { HomeUpcomingSection } from "@/src/features/home/ui/components/HomeUpcomingSection";
import { useCarouselScroll } from "@/src/features/home/ui/useCarouselScroll";

const Lottie = dynamic(
  () => import("lottie-react").then((mod) => mod.default || mod),
  { ssr: false },
);

export const HomeView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlDetailId = searchParams?.get("id");
  const { data: banners, isLoading: bannersLoading } = useHomeBanners();
  const { data: upcoming, isLoading: upcomingLoading } = useHomeUpcoming();
  const { isMypageOpen } = useMypageStore();

  // 검색어의 소스는 URL(?q=). q가 존재하면(빈 문자열 포함) 검색 모드.
  const rawQ = searchParams.get("q"); // null=홈 / ''=빈 검색모드 / '아이유'=검색
  const isSearchMode = rawQ !== null; // 검색 모드 판정(존재 여부) — 옛 !!searchValue
  const searchValue = rawQ ?? ""; // 실제 검색어 값

  // 레이아웃 전환(배너 접기/홈 숨기기)은 isSearchMode로 즉시 처리하고,
  // 무거운 SearchContent 마운트는 deferredSearchValue로 지연 처리
  const deferredSearchValue = useDeferredValue(searchValue);

  const [isBannerFolded, setIsBannerFolded] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [activeTab, setActiveTab] = useState(0);

  const { wishlistMap, initWishlist } = useWishlistStore();

  const { toggle: toggleFavorite } = useFavoriteToggle({
    onRequireLogin: () =>
      setModalConfig({
        isOpen: true,
        title: "로그인 필요",
        content: "로그인이 필요한 서비스입니다.",
        confirmText: "로그인 하기",
        showCancelButton: true,
        onConfirm: () => {
          const currentPath = encodeURIComponent(
            window.location.pathname + window.location.search,
          );
          window.location.href = `/login?redirect=${currentPath}`;
        },
      }),
  });
  const queryClient = useQueryClient();

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
    onConfirm?: () => void;
    confirmText?: string;
    showCancelButton?: boolean;
  }>({ isOpen: false, title: "", content: "" });
  const [playLoveAnimation, setPlayLoveAnimation] = useState(false);

  const { data: categoryList, isLoading: categoriesLoading } =
    useHomeCategories();
  const tabItems = [
    "전체",
    ...(categoryList?.map((c) => c.categoryName) || []),
  ];

  const categoryId =
    activeTab === 0 ? undefined : categoryList?.[activeTab - 1]?.categoryId;
  const { data: ranking, isLoading: rankingLoading } =
    useHomeRanking(categoryId);

  // 훅이 돌려주는 객체를 통째로 들고 다니면, 그중 하나를 ref= 로 넘긴 순간
  // 린트가 객체 전체를 ref로 보고 나머지 접근까지 "렌더 중 ref 접근"으로 잡는다.
  // 여기서 꺼내두면 그 오해가 사라지고, 두 캐러셀도 이름으로 구분된다.
  const {
    scrollRef: rankingScrollRef,
    canScrollLeft: canScrollRankingLeft,
    canScrollRight: canScrollRankingRight,
    scroll: scrollRanking,
  } = useCarouselScroll();
  const {
    scrollRef: upcomingScrollRef,
    canScrollLeft: canScrollUpcomingLeft,
    canScrollRight: canScrollUpcomingRight,
    scroll: scrollUpcoming,
  } = useCarouselScroll();

  const {
    selectedDetailId,
    isDetailBannerOpen,
    openDetail,
    closeDetail,
    clickedLayoutId,
  } = useDetailStore();
  const activeDetailId = selectedDetailId || urlDetailId;
  const { data: detailData, isLoading: detailLoading } = useDetailDataWithFixtures(
    activeDetailId || undefined,
  );
  // 부팅 복구가 끝나기 전에는 토큰이 아직 없어 역할도 비어 있다. isResolved를 같이
  // 봐야 로그인한 기획사·관리자에게 버튼이 잠깐 사라졌다 나타나는 일이 없다.
  const { isResolved: isAuthResolved } = useAuth();
  const accessRoles = getAccessTokenRoles();
  const canEnterAgency = isAuthResolved && accessRoles.includes("ORGANIZER");
  const canEnterAdmin = isAuthResolved && accessRoles.includes("ADMIN");

  useEffect(() => {
    const handleLoveAnimation = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (
        customEvent.detail &&
        customEvent.detail.eventId === activeDetailId?.toString()
      ) {
        setPlayLoveAnimation(false);
        setTimeout(() => setPlayLoveAnimation(true), 10);
      }
    };
    window.addEventListener("play-love-animation", handleLoveAnimation);
    return () =>
      window.removeEventListener("play-love-animation", handleLoveAnimation);
  }, [activeDetailId]);

  useEffect(() => {
    // 1초마다 배너 자동 전환
    if (
      banners?.length &&
      !isBannerFolded &&
      !isSearchMode &&
      !isMypageOpen &&
      !selectedDetailId
    ) {
      const timer = setInterval(() => {
        setCurrentBanner((prev) => (prev + 1) % (banners?.length || 1));
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [
    banners?.length,
    isBannerFolded,
    isSearchMode,
    isMypageOpen,
    selectedDetailId,
  ]);

  // 검색, 마이페이지 진입 시 배너 자동 접힘. 홈이나 디테일 진입 시 자동 열림.
  useEffect(() => {
    if (isSearchMode || isMypageOpen) {
      setIsBannerFolded(true);
    } else {
      setIsBannerFolded(false);
    }
  }, [isSearchMode, isMypageOpen, activeDetailId]);

  // 로그인된 사용자만 찜 목록을 조회 (비로그인 시 불필요한 401 에러 및 강제 리디렉트 방지)
  //
  // 부팅 복구가 끝난 뒤에 판단해야 한다. 마운트 시점에는 로그인한 사용자도 아직
  // 토큰이 없어, 그대로 두면 찜 목록을 건너뛴 채 화면이 굳는다.
  useEffect(() => {
    if (!isAuthResolved) return;
    if (!getAccessToken()) return;
    getFavoriteEvents()
      .then((res) => {
        const ids: string[] = [];
        if (res.data?.items) {
          res.data.items.forEach((item) => ids.push(String(item.eventId)));
        }
        initWishlist(ids);
      })
      .catch((err) => {
        // API 실패 시 무시 (토큰 만료 등)
      });
  }, [isAuthResolved]);

  const totalBanners = banners?.length || 0;
  const activeBanner = activeDetailId
    ? {
        id: activeDetailId,
        imageUrl: detailData?.imageUrl || "",
        title: detailData?.title || "",
        venue: detailData?.venue || "",
        date: detailData?.startDate || "",
        subtitle: "",
      }
    : banners?.[currentBanner];

  const goNext = () =>
    setCurrentBanner((prev) => (prev + 1) % (totalBanners || 1));
  const goPrev = () =>
    setCurrentBanner(
      (prev) => (prev - 1 + (totalBanners || 1)) % (totalBanners || 1),
    );

  const handleCardClick = (eventId: string, layoutId?: string) => {
    openDetail(eventId, layoutId);
  };

  const handleWishlistToggle = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    await toggleFavorite(eventId);
  };

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["homeBanners"] }),
      queryClient.invalidateQueries({ queryKey: ["homeRanking"] }),
      queryClient.invalidateQueries({ queryKey: ["homeUpcoming"] }),
    ]);
  };

  return (
    <div className="w-full h-[100dvh] overflow-hidden bg-[#f8f8f8]">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="flex flex-col lg:flex-row w-full h-auto min-h-[100dvh] lg:h-[100dvh] bg-[#f8f8f8] font-sans relative">
          {/* Left Column: 배너 슬라이드 */}
          <aside
            className={`relative transition-[width,height,min-width,opacity] duration-150 ease-out shrink-0 will-change-[width,opacity] ${
              isBannerFolded
                ? "hidden lg:block lg:w-0 lg:min-w-0 opacity-0"
                : activeDetailId
                  ? "hidden lg:block lg:h-full lg:w-2/5 lg:min-w-[40%] opacity-100"
                  : "w-full h-[28vh] min-h-[220px] md:h-[35vh] lg:h-full lg:w-2/5 lg:min-w-[40%] opacity-100"
            }`}
          >
            <div className="w-full h-full overflow-hidden">
              <motion.div
                className={`w-full lg:w-[40vw] h-full relative origin-center ${!activeDetailId && activeBanner?.id ? "cursor-pointer" : ""}`}
                layoutId={clickedLayoutId || "main-banner"}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                onClick={() => {
                  if (!activeDetailId && activeBanner?.id) {
                    handleCardClick(activeBanner.id, "main-banner");
                  }
                }}
              >
                <BannerPoster
                  src={activeBanner?.imageUrl || ""}
                  alt="Home Banner"
                  isLoading={
                    bannersLoading || (!!selectedDetailId && detailLoading)
                  }
                  width="100%"
                  height="100%"
                  showGradient={!activeDetailId} // 디테일 배너는 그라디언트 없이 원본 표시
                  className="rounded-none md:rounded-none max-w-full"
                >
                  {/* 하트 애니메이션 (상단 오버레이 레이어) */}
                  {playLoveAnimation && activeDetailId && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                      <Lottie
                        animationData={loveAnimation}
                        loop={false}
                        onComplete={() => setPlayLoveAnimation(false)}
                        className="w-[80%] max-w-[400px] h-auto"
                      />
                    </div>
                  )}
                  <div className="flex flex-col justify-between h-full p-4">
                    {/* 우측 상단: 썸네일 리스트만 렌더링 */}
                    {totalBanners > 1 && !activeDetailId && (
                      <div className="flex justify-end w-full">
                        <div className="hidden lg:flex items-center gap-2">
                          {banners?.map((b, idx) => (
                            <button
                              key={`${b.id}-${idx}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentBanner(idx);
                              }}
                              className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all duration-300 shadow-md ${
                                currentBanner === idx
                                  ? "border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)] z-10"
                                  : "border-transparent opacity-60 hover:opacity-100 hover:scale-105"
                              }`}
                              aria-label={`${idx + 1}번 배너로 이동`}
                            >
                              <ThumbnailImage
                                src={b.imageUrl}
                                alt={
                                  b.subtitle?.replace(" 랭킹 1위", "") ||
                                  b.title ||
                                  `Banner ${idx + 1}`
                                }
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 하단: 타이틀 등 정보 표시 */}
                    {!activeDetailId && (
                      <div className="mt-auto w-full max-w-4xl flex flex-col items-start gap-1 pb-2">
                        {activeBanner?.subtitle && (
                            <span className="inline-flex items-center rounded bg-primary/90 px-2 py-0.5 text-[11px] md:text-xs font-bold tracking-wider text-white mb-1 shadow-sm">
                              {activeBanner.subtitle}
                            </span>
                          )}
                        <BannerTitle
                          title={activeBanner?.title || ""}
                          isLoading={bannersLoading}
                        />
                        <BannerPlace
                          place={activeBanner?.venue || ""}
                          isLoading={bannersLoading}
                        />
                        <BannerTime
                          time={activeBanner?.date || ""}
                          isLoading={bannersLoading}
                        />
                      </div>
                    )}
                  </div>
                </BannerPoster>
              </motion.div>
            </div>
          </aside>

          {/* Toggle Button - absolute positioning을 사용하여 flex 레이아웃의 빈 공간(gap) 발생 방지 */}
          {!isSearchMode && !isMypageOpen && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 z-50 hidden lg:flex transition-[left,transform] duration-150 ease-out ${
                isBannerFolded
                  ? "left-0 translate-x-2"
                  : "left-[40%] -translate-x-1/2"
              }`}
            >
              <PanelToggle
                isFolded={isBannerFolded}
                onToggle={() => setIsBannerFolded(!isBannerFolded)}
              />
            </div>
          )}

          {/* Right Column: Main Content */}
          <main
            className={`flex-1 min-w-0 flex flex-col px-4 pt-0 pb-24 md:px-8 md:pb-10 lg:px-10 lg:pb-16 lg:h-full lg:overflow-y-auto transition-all duration-150 relative ${activeDetailId ? "" : "scrollbar-hide [&::-webkit-scrollbar]:hidden"}`}
            style={
              activeDetailId
                ? {}
                : { scrollbarWidth: "none", msOverflowStyle: "none" }
            }
          >
            <div className="hidden lg:block">
              <Header />
            </div>

            {/* 검색 중일 때: 홈 컨텐츠 대신 검색 결과 렌더링 */}
            {isSearchMode && (
              <div
                key="search"
                className="flex-1 w-full min-w-0 animate-fade-in"
              >
                <SearchContent query={deferredSearchValue || " "} />
              </div>
            )}
            {!isSearchMode && isMypageOpen && (
              <div
                key="mypage"
                className="flex-1 w-full min-w-0 animate-fade-in"
              >
                <MyPageContent />
              </div>
            )}
            {!isSearchMode && !isMypageOpen && activeDetailId && (
              <div
                key="detail"
                className="flex-1 w-full min-w-0 animate-fade-in"
              >
                <DetailView isOverlay={true} />
              </div>
            )}
            <div
              className={`flex-1 w-full min-w-0 flex flex-col ${isSearchMode || isMypageOpen || activeDetailId ? "hidden" : ""}`}
            >
              {canEnterAgency || canEnterAdmin ? (
                <section className="mt-4">
                  <div className="rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-950">
                          관리 페이지 바로가기
                        </p>
                        <p className="mt-1 text-sm font-medium text-content-tertiary">
                          현재 계정 권한으로 접근 가능한 페이지입니다.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canEnterAgency ? (
                          <button
                            type="button"
                            onClick={() => router.push("/agency")}
                            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-surface-inverse"
                          >
                            Agency 페이지
                          </button>
                        ) : null}
                        {canEnterAdmin ? (
                          <button
                            type="button"
                            onClick={() => router.push("/admin")}
                            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:bg-primary-hover"
                          >
                            Admin 페이지
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              <HomeRankingSection
                ranking={ranking}
                rankingLoading={rankingLoading}
                tabItems={tabItems}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                rankingScrollRef={rankingScrollRef}
                canScrollRankingLeft={canScrollRankingLeft}
                canScrollRankingRight={canScrollRankingRight}
                scrollRanking={scrollRanking}
                wishlistMap={wishlistMap}
                handleCardClick={handleCardClick}
                handleWishlistToggle={handleWishlistToggle}
              />

              <HomeUpcomingSection
                upcoming={upcoming}
                upcomingLoading={upcomingLoading}
                upcomingScrollRef={upcomingScrollRef}
                canScrollUpcomingLeft={canScrollUpcomingLeft}
                canScrollUpcomingRight={canScrollUpcomingRight}
                scrollUpcoming={scrollUpcoming}
                wishlistMap={wishlistMap}
                handleCardClick={handleCardClick}
                handleWishlistToggle={handleWishlistToggle}
              />
            </div>

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
              confirmText={modalConfig.confirmText || "확인"}
              showCancelButton={modalConfig.showCancelButton ?? false}
            />

            {/* 전역 푸터 (하단 스크롤 시 모든 뷰에서 등장) */}
            <Footer />
          </main>
        </div>
      </PullToRefresh>
      {!activeDetailId && <MobileBottomNav />}
    </div>
  );
};
