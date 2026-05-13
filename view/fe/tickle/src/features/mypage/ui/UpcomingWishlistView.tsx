'use client';

import React, { useState } from 'react';
import { useMyUpcomingWishlist } from '@/src/features/mypage/api/useMyPageData';
import { useDetailStore } from '@/src/shared/store/useDetailStore';
import { useMypageStore } from '@/src/shared/store/useMypageStore';
import { useWishlistStore } from '@/src/shared/store/useWishlistStore';
import { createFavorite, deleteFavorite } from '@/src/shared/api/favoriteApi';
import { InfoCard } from '@/src/shared/components/InfoCard';
import { SearchListCard } from '@/src/shared/components/SearchListCard';
import { Text } from '@/src/shared/components/Text';

import { Modal } from '@/src/shared/components/Modal';
import Button from '@/src/shared/components/Button';

export const UpcomingWishlistView = () => {
  const { data: upcoming, isLoading, isError, error } = useMyUpcomingWishlist();
  const { wishlistMap, addWishlist, removeWishlist, initWishlist } = useWishlistStore();
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', content: '' });

  React.useEffect(() => {
    if (upcoming) {
      initWishlist(upcoming.map(item => item.id));
    }
  }, [upcoming, initWishlist]);

  const handleToggle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const isCurrentlyWishlisted = wishlistMap[id] !== false; // undefined or true means wishlisted in this context
      
      // 낙관적 업데이트
      if (isCurrentlyWishlisted) {
        removeWishlist(id);
      } else {
        addWishlist(id);
      }

      // API 호출
      if (isCurrentlyWishlisted) {
        await deleteFavorite(Number(id));
      } else {
        await createFavorite(Number(id));
      }

    } catch (err: any) {
      // 롤백
      const isCurrentlyWishlisted = wishlistMap[id] !== false;
      if (!isCurrentlyWishlisted) {
        addWishlist(id);
      } else {
        removeWishlist(id);
      }
      console.error('찜 상태 변경 실패:', err);
      if (err.status === 400) {
        setModalConfig({ isOpen: true, title: '잘못된 요청', content: '요청이 올바르지 않습니다.' });
      } else if (err.status === 404) {
        setModalConfig({ isOpen: true, title: '정보 없음', content: '해당 공연이나 찜 내역을 찾을 수 없습니다.' });
      } else if (err.status === 409) {
        setModalConfig({ isOpen: true, title: '이미 등록됨', content: '이미 찜한 공연입니다.' });
      } else {
        setModalConfig({ isOpen: true, title: '오류 발생', content: '처리 중 알 수 없는 오류가 발생했습니다.' });
      }
    }
  };

  // 표시할 총 관심 공연 수 (현재 찜 상태인 것만 카운트)
  const activeWishlistCount = upcoming?.filter(item => wishlistMap[item.id] !== false).length || 0;

  if (isError) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 bg-surface-subtle rounded-2xl border border-line">
        <Text typography="t5" fontWeight="bold" color="secondary" className="mb-2">목록을 불러오는 중 오류가 발생했습니다.</Text>
        <Text typography="t6" color="tertiary">
          {/* @ts-ignore */}
          {(error as any)?.status === 400 ? '잘못된 요청입니다.' : (error as any)?.status === 404 ? '사용자 정보를 찾을 수 없거나 로그인이 만료되었습니다.' : '잠시 후 다시 시도해주세요.'}
        </Text>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <Text typography="t5" color="secondary">
          총 <span className="font-bold text-primary">{activeWishlistCount}</span>개의 관심 공연이 있습니다.
        </Text>
      </div>

      {/* 모바일 가로 리스트(SearchListCard) 렌더링 - md 미만에서만 표시 */}
      <div className="flex flex-col gap-3 md:hidden pb-20">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="w-full">
              <SearchListCard src="" title="" isLoading={true} />
            </div>
          ))
        ) : upcoming && upcoming.length > 0 ? (
          upcoming.map((item) => {
            const isRemoved = wishlistMap[item.id] === false;
            return (
              <div
                key={item.id}
                className="w-full"
                onClick={() => {
                  useDetailStore.getState().openDetail(item.id, `poster-mypage-upcoming-list-${item.id}`);
                  useMypageStore.getState().closeMypage();
                }}
              >
                <SearchListCard
                  layoutId={`poster-mypage-upcoming-list-${item.id}`}
                  src={item.imageUrl}
                  title={item.title}
                  place={item.venue}
                  day={item.date}
                  disabled={item.openDate ? new Date(item.openDate).getTime() > Date.now() : false}
                  showTime={item.openDate ? new Date(item.openDate).getTime() > Date.now() : false}
                  targetDate={item.openDate}
                  isWishlisted={!isRemoved}
                  onWishlistToggle={(e) => handleToggle(e, item.id)}
                  wishlistVariant={isRemoved ? 'greyPlus' : 'default'}
                  badges={item.badges}
                />
              </div>
            );
          })
        ) : (
          <div className="w-full col-span-full flex flex-col items-center justify-center py-16 px-6 bg-surface-subtle rounded-2xl border border-line text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-content-muted mb-5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <Text typography="t5" fontWeight="bold" color="secondary" textAlign="center" className="mb-2 break-keep">
              관심 있는 공연이 없습니다.
            </Text>
            <Text typography="t6" color="tertiary" textAlign="center" className="break-keep max-w-[260px] md:max-w-none">
              홈 화면에서 기대되는 공연에 하트를 눌러보세요!
            </Text>
          </div>
        )}
      </div>

      {/* 태블릿/데스크톱 그리드 뷰 (InfoCard) - md 이상에서만 표시 */}
      <div className="hidden md:grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6 pb-20 justify-items-center">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="w-full flex justify-center">
              <InfoCard className="!w-full !max-w-[260px] sm:!max-w-[300px]" src="" title="" isLoading={true} showTime={true} />
            </div>
          ))
        ) : upcoming && upcoming.length > 0 ? (
          upcoming.map((item) => {
            const isRemoved = wishlistMap[item.id] === false;
            return (
              <div
                key={item.id}
                className="w-full flex justify-center transition-transform duration-200 cursor-pointer hover:scale-[1.02]"
                onClick={() => {
                  useDetailStore.getState().openDetail(item.id, `poster-mypage-upcoming-${item.id}`);
                  useMypageStore.getState().closeMypage();
                }}
              >
                <InfoCard
                  className="!w-full !max-w-[260px] sm:!max-w-[300px]"
                  layoutId={`poster-mypage-upcoming-${item.id}`}
                  src={item.imageUrl}
                  title={item.title}
                  place={item.venue}
                  day={item.date}
                  disabled={item.openDate ? new Date(item.openDate).getTime() > Date.now() : false}
                  showTime={item.openDate ? new Date(item.openDate).getTime() > Date.now() : false}
                  targetDate={item.openDate}
                  isWishlisted={!isRemoved}
                  onWishlistToggle={(e) => handleToggle(e, item.id)}
                  wishlistVariant={isRemoved ? 'greyPlus' : 'default'}
                  badges={item.badges}
                />
              </div>
            );
          })
        ) : null}
      </div>

      {/* 에러 모달 */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onConfirm={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.title}
        description={modalConfig.content}
        showCancelButton={false}
      />
    </div>
  );
};
