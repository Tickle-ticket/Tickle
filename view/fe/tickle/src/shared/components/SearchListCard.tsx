import React from 'react';
import { motion } from 'framer-motion';
import { InfoPoster } from './InfoPoster';
import { InfoTitle } from './InfoTitle';
import { InfoPlace } from './InfoPlace';
import { InfoDay } from './InfoDay';
import { Badge } from './Badge';
import { getBadgeColor } from '../utils/badgeColor';
import type { InfoCardProps } from './types';

export const SearchListCard = ({
  src,
  alt = '포스터 이미지',
  disabled = false,
  title,
  place,
  day,
  badges = [],
  isLoading = false,
  isWishlisted,
  onWishlistToggle,
  wishlistVariant = 'default',
  layoutId,
}: InfoCardProps) => {

  const displayBadges = badges.slice(0, 3);

  return (
    <div className="relative flex flex-row items-stretch w-full gap-4 p-3 bg-surface rounded-2xl shadow-sm border border-line-subtle cursor-pointer active:scale-[0.98] transition-transform">
      {/* 썸네일 포스터 영역 */}
      <div className="relative w-[80px] h-[112px] md:w-[100px] md:h-[140px] shrink-0 overflow-hidden rounded-xl shadow-sm">
        <motion.div 
          className="w-full h-full flex justify-center origin-center"
          layoutId={layoutId}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        >
          <InfoPoster 
            src={src} 
            alt={alt} 
            disabled={disabled}
            isLoading={isLoading}
          />
        </motion.div>
      </div>

      {/* 우측 정보 텍스트 영역 */}
      <div className="flex flex-col justify-start flex-1 min-w-0 py-1">
        <InfoTitle title={title} className="text-content mb-1 line-clamp-2" isLoading={isLoading} />
        
        <div className="flex flex-col gap-0.5 mt-auto mb-2">
          {place && <InfoPlace place={place} className="text-content-tertiary" isLoading={isLoading} />}
          {day && <InfoDay day={day} className="text-content-tertiary" isLoading={isLoading} />}
        </div>
        
        {!isLoading && displayBadges.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1.5">
            {displayBadges.map((badge, idx) => {
              if (typeof badge === 'string') {
                return (
                  <Badge key={idx} color={getBadgeColor(idx) as any} variant="fill" className="text-[10px] px-1.5 py-0.5">
                    {badge}
                  </Badge>
                );
              }
              return (
                <Badge key={idx} color={badge.color} variant={badge.variant} className="text-[10px] px-1.5 py-0.5">
                  {badge.text}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* 찜(Wishlist) 버튼 */}
      {!isLoading && onWishlistToggle && (
        <button
          onClick={onWishlistToggle}
          className={`absolute bottom-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 active:scale-90 ${
            wishlistVariant === 'greyPlus'
              ? 'bg-[#828282] hover:bg-surface-active'
              : isWishlisted 
                ? 'bg-danger shadow-md shadow-red-500/20' 
                : 'bg-surface-muted hover:bg-surface-active' 
          }`}
          aria-label={isWishlisted ? '찜 해제' : '찜 추가'}
        >
          {wishlistVariant === 'greyPlus' || !isWishlisted ? (
            <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none" stroke={wishlistVariant === 'greyPlus' ? 'white' : '#6b7280'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
            </svg>
          ) : (
            <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
};
