import React from 'react';
import type { BannerTitleProps } from './types';

export const BannerTitle = ({
  title,
  subtitle,
  date,
  venue,
  color,
  className = '',
  isLoading = false,
}: BannerTitleProps) => {
  if (isLoading) return null;

  return (
    <div 
      className={`flex flex-col items-start gap-1 w-full ${!color ? 'text-white' : ''} ${className}`}
      style={color ? { color } : undefined}
    >
      {/* 부제목 있을 경우 타이틀 위에 작게 배치 */}
      {subtitle && (
        <p className="text-sm md:text-base font-medium opacity-80 whitespace-pre-line line-clamp-2 break-keep mb-1">
          {subtitle}
        </p>
      )}

      {/* 1. 메인 타이틀 */}
      <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight whitespace-pre-line break-keep line-clamp-2 md:line-clamp-3 mb-2">
        {title}
      </h2>
      
      {/* 2. 장소 위치 */}
      {venue && (
        <div className="text-base md:text-lg font-bold whitespace-pre-line line-clamp-2 break-keep opacity-95 mt-1">
          {venue}
        </div>
      )}

      {/* 3. 예매 기간 */}
      {date && (
        <div className="text-sm md:text-base font-medium opacity-75 whitespace-pre-line line-clamp-2 break-keep">
          {date}
        </div>
      )}
    </div>
  );
};
