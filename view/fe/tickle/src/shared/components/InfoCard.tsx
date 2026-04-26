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
  isWishlisted,
  onWishlistToggle,
  wishlistVariant = 'default',
}: InfoCardProps) => {

  // 요구사항에 맞춰 뱃지는 최대 3개까지만 렌더링되게 방어 설계
  const displayBadges = badges.slice(0, 3);
  return (
    <div className={`relative flex flex-col max-w-[280px] w-full cursor-pointer ${className}`}>
      {/* 포스터와 내부 콘텐츠를 감싸는 래퍼 (이 부분에만 overflow-hidden 적용) */}
      <div className="relative w-full h-full overflow-hidden rounded-2xl">
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
              {displayBadges.map((badge, idx) => {
                if (typeof badge === 'string') {
                  return <Badge key={idx}>{badge}</Badge>;
                }
                return (
                  <Badge key={idx} color={badge.color} variant={badge.variant}>
                    {badge.text}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 찜(Wishlist) 상태 토글 버튼 (카드 안쪽 상단 여백 유지) */}
      {!isLoading && onWishlistToggle && (
        <button
          onClick={onWishlistToggle}
          className={`absolute top-3 right-3 z-40 w-11 h-11 flex items-center justify-center rounded-full shadow-md transition-all duration-300 active:scale-90 ${
            wishlistVariant === 'greyPlus'
              ? 'bg-[#828282] hover:bg-gray-600' // 회색 불투명 + 버튼
              : isWishlisted 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30 shadow-lg' // 빨간 하트 버튼
                : 'bg-black/40 hover:bg-black/60 backdrop-blur-md' // 반투명 + 버튼 (홈 화면 기본 상태)
          }`}
          aria-label={isWishlisted ? '찜 해제' : '찜 추가'}
        >
          {wishlistVariant === 'greyPlus' || !isWishlisted ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
};
