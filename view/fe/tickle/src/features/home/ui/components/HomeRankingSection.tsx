'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Tab from "@/src/shared/components/Tab";
import { Title } from "@/src/shared/components/Title";
import { InfoCard } from "@/src/shared/components/InfoCard";
import { Box } from "@/src/shared/components/Box";
import { CarouselNav } from "./CarouselNav";
import type { PerformanceData } from "@/src/features/home/api/useHomeData";

/**
 * 홈 화면의 "인기 랭킹" 섹션입니다.
 *
 * @param ranking      선택된 탭의 랭킹 목록
 * @param isLoading    조회 중인지
 * @param tabItems     카테고리 탭 이름
 * @param activeTab    선택된 탭 인덱스
 * @param onTabChange  탭 변경
 * @param scrollRef    캐러셀 요소 ref
 * @param canScrollLeft  왼쪽 이동 가능 여부
 * @param canScrollRight 오른쪽 이동 가능 여부
 * @param onScroll     캐러셀 이동
 * @param wishlistMap  이벤트별 찜 상태
 * @param onCardClick  카드 클릭
 * @param onWishlistToggle 찜 토글
 */
export const HomeRankingSection = ({
  ranking,
  rankingLoading,
  tabItems,
  activeTab,
  setActiveTab,
  rankingScrollRef,
  canScrollRankingLeft,
  canScrollRankingRight,
  scrollRanking,
  wishlistMap,
  handleCardClick,
  handleWishlistToggle,
}: {
  ranking: PerformanceData[] | undefined;
  rankingLoading: boolean;
  tabItems: string[];
  activeTab: number;
  setActiveTab: (idx: number) => void;
  rankingScrollRef: (node: HTMLDivElement | null) => void;
  canScrollRankingLeft: boolean;
  canScrollRankingRight: boolean;
  scrollRanking: (dir: "left" | "right") => void;
  wishlistMap: Record<string, boolean>;
  handleCardClick: (eventId: string, layoutId?: string) => void;
  handleWishlistToggle: (e: React.MouseEvent, eventId: string) => void;
}) => {
  const router = useRouter();

  return (
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
                canLeft={canScrollRankingLeft}
                canRight={canScrollRankingRight}
                onPrev={() => scrollRanking("left")}
                onNext={() => scrollRanking("right")}
              />
            </div>

            {/* 카드 */}
            <div
              ref={rankingScrollRef}
              className="overflow-x-auto pb-4 pt-2 px-2 -mx-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
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
                        <InfoCard
                          src=""
                          title=""
                          isLoading={true}
                          showRank={true}
                          rank={idx + 1}
                        />
                      </div>
                    ))
                  ) : !ranking || ranking.length === 0 ? (
                    <div className="flex-1 w-full flex flex-col items-center justify-center py-16 px-4 bg-surface-subtle/50 rounded-2xl border border-dashed border-line mx-2 shrink-0">
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-content-muted mb-3"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="9" y1="15" x2="15" y2="15"></line>
                      </svg>
                      <p className="text-content-tertiary font-medium text-sm sm:text-base">
                        현재 진행 중인 인기 공연이 없습니다.
                      </p>
                      <p className="text-content-muted text-xs sm:text-sm mt-1">
                        곧 새로운 공연이 업데이트될 예정입니다.
                      </p>
                    </div>
                  ) : (
                    ranking?.map((item, idx) => {
                      const isWishlisted = !!wishlistMap[item.id];
                      return (
                        <div
                          key={item.id}
                          className="shrink-0 relative cursor-pointer hover:scale-[1.02] hover:z-10 transition-all duration-200"
                          onClick={() =>
                            handleCardClick(
                              item.id,
                              `poster-ranking-${item.id}`,
                            )
                          }
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
                            onWishlistToggle={(e) =>
                              handleWishlistToggle(e, item.id)
                            }
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
              <span className="flex-1 h-px bg-surface-active" />
              <button
                onClick={() =>
                  router.push(
                    `/?q=${encodeURIComponent(tabItems[activeTab])}`,
                  )
                }
                className="group cursor-pointer"
              >
                <Box
                  variant="outline"
                  padding="none"
                  className="py-2 px-5 hover:bg-surface-subtle transition-colors flex items-center justify-center"
                >
                  <span className="text-sm text-content-tertiary group-hover:text-content transition-colors whitespace-nowrap font-medium">
                    더보기
                  </span>
                </Box>
              </button>
              <span className="flex-1 h-px bg-surface-active" />
            </div>
          </section>
  );
};
