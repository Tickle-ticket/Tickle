import React, { useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { InfoPoster } from './InfoPoster';
import { InfoTitle } from './InfoTitle';
import { InfoPlace } from './InfoPlace';
import { InfoDay } from './InfoDay';
import { InfoRank } from './InfoRank';
import { InfoTime } from './InfoTime';
import { Badge } from './Badge';
import { getBadgeColor } from '../utils/badgeColor';
import type { InfoCardProps } from './types';
import loveAnimation from '../lottle/Love.json';

// Lottie는 클라이언트 사이드에서만 렌더링되도록 dynamic import 처리
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

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
  layoutId,
  priority = false,
}: InfoCardProps) => {

  const [showLottie, setShowLottie] = useState(false);

  // 요구사항에 맞춰 뱃지는 최대 3개까지만 렌더링되게 방어 설계
  const displayBadges = badges.slice(0, 3);
  return (
    <div className={`relative flex flex-col max-w-[150px] md:max-w-[200px] lg:max-w-[280px] w-[150px] md:w-[200px] lg:w-[280px] cursor-pointer ${className}`}>
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

        {/* 배경 포스터 이미지 */}
        <div className="w-full flex justify-center origin-center">
          <InfoPoster
            src={src}
            alt={alt}
            disabled={disabled}
            isLoading={isLoading}
            priority={priority}
          />
        </div>

        {/* 내부 텍스트 영역: 포스터 위로 올라가도록 절대 위치(absolute) 지정 */}
        <div className="absolute inset-0 flex flex-col justify-end items-start gap-0 md:gap-0.5 lg:gap-1 p-3 md:p-4 lg:p-5 z-10 pointer-events-none">
          <InfoTitle title={title} className="text-white mb-0.5 drop-shadow-md" isLoading={isLoading} />

          {place && <InfoPlace place={place} className="text-white/95 drop-shadow-sm" isLoading={isLoading} />}

          {day && <InfoDay day={day} className="text-white/80 drop-shadow-sm" isLoading={isLoading} />}

          {!isLoading && displayBadges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1 md:gap-1.5 pointer-events-auto">
              {displayBadges.map((badge, idx) => {
                if (typeof badge === 'string') {
                  return (
                    <Badge key={idx} color="grey" variant="glass" maxLength={15} className="text-[9px] md:text-[10px] px-1.5 py-0.5 md:px-2 md:py-1 rounded-full font-bold tracking-wide">
                      {badge.replace(/^#/, '')}
                    </Badge>
                  );
                }
                return (
                  <Badge key={idx} color="grey" variant="glass" maxLength={15} className="text-[9px] md:text-[10px] px-1.5 py-0.5 md:px-2 md:py-1 rounded-full font-bold tracking-wide">
                    {badge.text.replace(/^#/, '')}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* 하트 Lottie 애니메이션 (포스터 중앙, 조금 크게) */}
        {showLottie && (
          <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="w-40 h-40 md:w-48 md:h-48 flex items-center justify-center">
              <Lottie 
                animationData={loveAnimation} 
                loop={false} 
                autoplay={true} 
                onComplete={() => setShowLottie(false)}
              />
            </div>
          </div>
        )}
      </div>

      {/* 찜(Wishlist) 상태 토글 버튼 (카드 안쪽 상단 여백 유지) */}
      {!isLoading && onWishlistToggle && (
        <motion.button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isWishlisted) {
              setShowLottie(true);
            }
            onWishlistToggle(e as any);
          }}
          whileTap={{ scale: 0.85 }}
          animate={isWishlisted ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
          className={`absolute top-2 right-2 md:top-2.5 md:right-2.5 lg:top-3 lg:right-3 z-40 w-8 h-8 md:w-9 md:h-9 lg:w-11 lg:h-11 flex items-center justify-center rounded-full shadow-md transition-colors duration-300 ${wishlistVariant === 'greyPlus'
              ? 'bg-[#828282] hover:bg-surface-active' // 회색 불투명 + 버튼
              : isWishlisted
                ? 'bg-danger hover:bg-danger-hover shadow-red-500/30 shadow-lg' // 빨간 하트 버튼
                : 'bg-black/40 hover:bg-black/60 backdrop-blur-md' // 반투명 + 버튼 (홈 화면 기본 상태)
            }`}
          aria-label={isWishlisted ? '찜 해제' : '찜 추가'}
        >
          {wishlistVariant === 'greyPlus' || !isWishlisted ? (
            <svg className="w-[16px] h-[16px] md:w-[18px] md:h-[18px] lg:w-[22px] lg:h-[22px]" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
            </svg>
          ) : (
            <motion.svg 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="w-[16px] h-[16px] md:w-[18px] md:h-[18px] lg:w-[22px] lg:h-[22px]" 
              viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </motion.svg>
          )}
        </motion.button>
      )}
    </div>
  );
};
