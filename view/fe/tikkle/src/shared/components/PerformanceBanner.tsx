import React from 'react';
import { BannerPoster } from './BannerPoster';
import { BannerTitle } from './BannerTitle';
import { BannerNavigation } from './BannerNavigation';
import type { PerformanceBannerProps } from './types';

export const PerformanceBanner = ({
  src,
  alt = '홈 메인 배너',
  width,
  height,
  title,
  subtitle,
  date,
  venue,
  color,
  className = '',
  currentBadge,
  totalBadge,
  onNext,
  onPrev,
  isLoading = false,
}: PerformanceBannerProps) => {
  return (
    <BannerPoster 
      src={src} 
      alt={alt} 
      width={width} 
      height={height} 
      className={className}
      isLoading={isLoading}
    >
      {/* Top Right: 배너 위치 컴포넌트 */}
      {(currentBadge !== undefined && totalBadge !== undefined) && (
        <div className="flex justify-end w-full mb-auto">
          <BannerNavigation 
            variant="dots" 
            current={currentBadge} 
            total={totalBadge} 
            onNext={onNext} 
            onPrev={onPrev} 
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Bottom Left: 배너 타이틀 영역 */}
      <div className="mt-auto w-full max-w-4xl">
        <BannerTitle
          title={title}
          subtitle={subtitle}
          date={date}
          venue={venue}
          color={color || 'white'}
          isLoading={isLoading}
        />
      </div>
    </BannerPoster>
  );
};
