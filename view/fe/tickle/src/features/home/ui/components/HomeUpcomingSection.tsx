'use client';

import { Title } from "@/src/shared/components/Title";
import { InfoCard } from "@/src/shared/components/InfoCard";
import { CarouselNav } from "./CarouselNav";
import type { PerformanceData } from "@/src/features/home/api/useHomeData";

/**
 * 홈 화면의 "오픈 예정" 섹션입니다.
 *
 * @param upcoming        오픈 예정 목록
 * @param upcomingLoading 조회 중인지
 */
export const HomeUpcomingSection = ({
  upcoming,
  upcomingLoading,
  upcomingScrollRef,
  canScrollUpcomingLeft,
  canScrollUpcomingRight,
  scrollUpcoming,
  wishlistMap,
  handleCardClick,
  handleWishlistToggle,
}: {
  upcoming: PerformanceData[] | undefined;
  upcomingLoading: boolean;
  upcomingScrollRef: (node: HTMLDivElement | null) => void;
  canScrollUpcomingLeft: boolean;
  canScrollUpcomingRight: boolean;
  scrollUpcoming: (dir: "left" | "right") => void;
  wishlistMap: Record<string, boolean>;
  handleCardClick: (eventId: string, layoutId?: string) => void;
  handleWishlistToggle: (e: React.MouseEvent, eventId: string) => void;
}) => (
        <section className="mt-16 pb-32">
          <div className="flex items-center mb-6">
            <Title
              title="오픈 예정"
              bottomBorder={false}
              className="!bg-transparent [&>div]:!p-0 !text-2xl [&_h1]:!text-2xl"
            />
            <CarouselNav
              canLeft={canScrollUpcomingLeft}
              canRight={canScrollUpcomingRight}
              onPrev={() => scrollUpcoming("left")}
              onNext={() => scrollUpcoming("right")}
            />
          </div>

          {/* 카드 */}
          <div
            ref={upcomingScrollRef}
            className="flex gap-5 overflow-x-auto pb-4 pt-5 px-2 -mx-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {upcomingLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="shrink-0">
                  <InfoCard
                    src=""
                    title=""
                    isLoading={true}
                    showTime={true}
                  />
                </div>
              ))
            ) : !upcoming || upcoming.length === 0 ? (
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
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="18"
                    rx="2"
                    ry="2"
                  ></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <p className="text-content-tertiary font-medium text-sm sm:text-base">
                  현재 오픈 예정인 공연이 없습니다.
                </p>
                <p className="text-content-muted text-xs sm:text-sm mt-1">
                  새로운 공연 소식을 기다려주세요!
                </p>
              </div>
            ) : (
              upcoming?.map((item, idx) => {
                const isWishlisted = !!wishlistMap[item.id];
                return (
                  <div
                    key={item.id}
                    className="shrink-0 relative cursor-pointer hover:scale-[1.02] hover:z-10 transition-all duration-200"
                    onClick={() =>
                      handleCardClick(
                        item.id,
                        `poster-upcoming-${item.id}`,
                      )
                    }
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
          </div>
        </section>
);
