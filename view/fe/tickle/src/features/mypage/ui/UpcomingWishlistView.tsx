'use client';

import React, { useState } from 'react';
import { useMyUpcomingWishlist } from '@/src/features/mypage/api/useMyPageData';
import { useDetailStore } from '@/src/shared/store/useDetailStore';
import { useMypageStore } from '@/src/shared/store/useMypageStore';
import { createFavorite, deleteFavorite } from '@/src/shared/api/favoriteApi';
import { InfoCard } from '@/src/shared/components/InfoCard';
import { Text } from '@/src/shared/components/Text';

export const UpcomingWishlistView = () => {
  const { data: upcoming, isLoading } = useMyUpcomingWishlist();
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const handleToggle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const isCurrentlyRemoved = removedIds.has(id);
      
      // 현재 제거된 상태(회색 +버튼)라면 -> 찜 추가 API 호출
      // 현재 추가된 상태(빨간 하트)라면 -> 찜 해제 API 호출
      if (isCurrentlyRemoved) {
        await createFavorite(Number(id));
      } else {
        await deleteFavorite(Number(id));
      }

      // API 호출이 성공하면 로컬 상태 업데이트 (카드를 제거하지 않고 UI 상태만 토글)
      setRemovedIds(prev => {
        const next = new Set(prev);
        if (isCurrentlyRemoved) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    } catch (error) {
      console.error('찜 상태 변경 실패:', error);
    }
  };

  // 표시할 총 관심 공연 수 (제거되지 않은 것만 카운트)
  const activeWishlistCount = upcoming?.filter(item => !removedIds.has(item.id)).length || 0;

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <Text typography="t5" color="secondary">
          총 <span className="font-bold text-blue-600">{activeWishlistCount}</span>개의 관심 공연이 있습니다.
        </Text>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="w-full">
              <InfoCard src="" title="" isLoading={true} showTime={true} />
            </div>
          ))
        ) : upcoming && upcoming.length > 0 ? (
          upcoming.map((item) => {
            const isRemoved = removedIds.has(item.id);
            return (
              <div
                key={item.id}
                className="w-full flex justify-center transition-transform duration-200 cursor-pointer hover:scale-[1.02]"
                onClick={() => {
                  useDetailStore.getState().openDetail(item.id, `poster-mypage-upcoming-${item.id}`);
                  useMypageStore.getState().closeMypage();
                }}
              >
                <div className="w-full max-w-[280px]">
                  <InfoCard
                    layoutId={`poster-mypage-upcoming-${item.id}`}
                    src={item.imageUrl}
                    title={item.title}
                    place={item.venue}
                    day={item.date}
                    disabled={true}
                    showTime={true}
                    targetDate={item.openDate}
                    isWishlisted={!isRemoved}
                    onWishlistToggle={(e) => handleToggle(e, item.id)}
                    wishlistVariant={isRemoved ? 'greyPlus' : 'default'}
                    badges={item.badges.map((b) => ({
                      text: b,
                      color: b === 'HOT' ? 'red' : b === 'NEW' ? 'green' : b === 'BEST' ? 'blue' : 'grey' as any,
                      variant: 'fill' as const,
                    }))}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-gray-200">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-4">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <Text typography="t5" fontWeight="bold" color="secondary" className="mb-1">관심 있는 공연이 없습니다.</Text>
            <Text typography="t6" color="tertiary">홈 화면에서 기대되는 공연에 하트를 눌러보세요!</Text>
          </div>
        )}
      </div>
    </div>
  );
};
