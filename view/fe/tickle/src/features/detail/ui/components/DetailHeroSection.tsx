'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Title } from '@/src/shared/components/Title';
import { Badge } from '@/src/shared/components/Badge';
import { BannerTime } from '@/src/shared/components/BannerTime';
import { BannerPoster } from '@/src/shared/components/BannerPoster';
import loveAnimation from '@/src/shared/lottle/Love.json';
import type { DetailData } from '@/src/features/detail/api/useDetailData';

const Lottie = dynamic(() => import('lottie-react').then((mod) => mod.default || mod), { ssr: false });

/**
 * 상세 화면 상단(모바일 헤더·히어로 포스터·제목/태그/일정·액션 버튼)입니다.
 *
 * @param data              상세 데이터
 * @param isLoading         조회 중인지
 * @param playLoveAnimation 찜 하트 애니메이션을 재생할지
 * @param onLoveAnimationEnd 애니메이션이 끝났을 때
 * @param onBack            모바일 뒤로가기 버튼
 * @param actionButtons     하단 예매·찜 버튼 묶음
 */
export const DetailHeroSection = ({
  data,
  isLoading,
  playLoveAnimation,
  onLoveAnimationEnd,
  onBack,
  actionButtons,
}: {
  data: DetailData | undefined;
  isLoading: boolean;
  playLoveAnimation: boolean;
  onLoveAnimationEnd: () => void;
  onBack: () => void;
  actionButtons: ReactNode;
}) => (
  <>
  {/* Mobile/Tablet Header (Transparent Floating) */}
  <div className="lg:hidden fixed top-0 left-0 z-[60] p-4 pointer-events-none">
    <button
      onClick={onBack}
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
            onComplete={onLoveAnimationEnd}
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
      {actionButtons}
    </div>
  </section>
  </>
);
