import React from 'react';
import { InfoPoster } from './InfoPoster';
import { InfoTitle } from './InfoTitle';
import { InfoPlace } from './InfoPlace';
import { InfoDay } from './InfoDay';
import { InfoRank } from './InfoRank';
import { InfoTime } from './InfoTime';
import { Badge } from './Badge';
import type { InfoCardProps } from './types';

export const InfoCard = ({
  src,
  alt = '포스터 이미지',
  disabled = false,
  title,
  place,
  day,
  badges = [],
  rank = 1,
  showRank = false,
  targetDate,
  showTime = false,
  className = '',
  isLoading = false,
}: InfoCardProps) => {

  // 요구사항에 맞춰 뱃지는 최대 3개까지만 렌더링되게 방어 설계
  const displayBadges = badges.slice(0, 3);
  return (
    <div className={`relative flex flex-col max-w-[280px] w-full cursor-pointer overflow-hidden rounded-2xl ${className}`}>
      {/* 랭크 컴포넌트: showRank 설정이 켜져있을 때 왼쪽 상단에 표시 */}
      {showRank && <InfoRank rank={rank} isLoading={isLoading} />}

      {/* 남은 시간 표시: showTime이 켜져있을 때 정확히 가운데에 표시 */}
      {showTime && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <InfoTime targetDate={targetDate} className="pointer-events-auto" isLoading={isLoading} />
        </div>
      )}

      {/* 배경 포스터 이미지 (호버 효과 제거) */}
      <div className="w-full flex justify-center">
        <InfoPoster 
          src={src} 
          alt={alt} 
          disabled={disabled}
          isLoading={isLoading}
        />
      </div>

      {/* 내부 텍스트 영역: 포스터 위로 올라가도록 절대 위치(absolute) 지정 */}
      <div className="absolute inset-0 flex flex-col justify-end items-start gap-0.5 p-5 z-10 pointer-events-none">
        <InfoTitle title={title} className="text-white mb-0.5 drop-shadow-md" isLoading={isLoading} />
        
        {place && <InfoPlace place={place} className="text-white/95 drop-shadow-sm" isLoading={isLoading} />}
        
        {day && <InfoDay day={day} className="text-white/80 drop-shadow-sm" isLoading={isLoading} />}
        
        {!isLoading && displayBadges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 pointer-events-auto">
            {displayBadges.map((b, idx) => {
              const isString = typeof b === 'string';
              const text = isString ? b : b.text;
              const color = isString ? 'red' : (b.color || 'red');
              const variant = isString ? 'outline' : (b.variant || 'outline');

              // 공용 컴포넌트인 Badge를 사용하여 배지 추가
              return (
                <Badge 
                  key={idx}
                  size="small" 
                  color={color} 
                  variant={variant} 
                  isLoading={isLoading}
                  className={
                    color === 'red' && variant === 'outline'
                      ? "bg-white/90 border-red-400 text-red-500 shadow-sm"
                      : "shadow-sm backdrop-blur-md bg-white/10" // 커스텀 색상 시 프리미엄 반투명 효과
                  }
                >
                  {text}
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
