'use client';

import React, { useState } from 'react';
import { useMyUpcomingWishlist } from '@/src/features/mypage/api/useMyPageData';
import { useDetailStore } from '@/src/shared/store/useDetailStore';
import { useMypageStore } from '@/src/shared/store/useMypageStore';
import { useWishlistStore } from '@/src/shared/store/useWishlistStore';
import { useFavoriteToggle } from '@/src/features/favorite/api/useFavoriteToggle';
import { InfoCard } from '@/src/shared/components/InfoCard';
import { SearchListCard } from '@/src/shared/components/SearchListCard';
import { Text } from '@/src/shared/components/Text';
import { ApiErrorView } from '@/src/shared/components/ApiErrorView';
import { useNow } from '@/src/shared/hooks/useNow';

import { Modal } from '@/src/shared/components/Modal';
import Button from '@/src/shared/components/Button';

export const UpcomingWishlistView = () => {
  const { data: upcoming, isLoading, isError, error } = useMyUpcomingWishlist();
  const { wishlistMap, initWishlist } = useWishlistStore();
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', content: '' });

  // 오픈 예정 여부를 시각으로 판정한다. 렌더 중 Date.now()로 읽으면 오픈 시각이
  // 지나도 리렌더가 없어 카드가 계속 "오픈 예정"으로 남는다.
  const now = useNow();

  // 마이페이지는 로그인 상태를 전제로 하므로 로그인 유도는 두지 않는다.
  // 404·409(이미 원하는 상태)는 훅이 성공으로 처리하고, 그 밖의 실패만 알린다.
  const { toggle: toggleFavorite } = useFavoriteToggle({
    onError: () =>
      setModalConfig({
        isOpen: true,
        title: '오류 발생',
        content: '찜 상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      }),
  });

  React.useEffect(() => {
    if (upcoming) {
      initWishlist(upcoming.map(item => item.id));
    }
  }, [upcoming, initWishlist]);

  const handleToggle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // 이 화면은 찜한 공연 목록이라 값이 없는 항목도 찜 상태로 본다.
    await toggleFavorite(id, wishlistMap[id] !== false);
  };

  // 표시할 총 관심 공연 수 (현재 찜 상태인 것만 카운트)
  const activeWishlistCount = upcoming?.filter(item => wishlistMap[item.id] !== false).length || 0;

  // 403·404·5xx는 QueryProvider의 throwOnError가 Error Boundary로 올려보낸다.
  // 여기 도달하는 것은 400·409처럼 화면 맥락이 필요한 에러이며,
  // 문구는 서버 message를 그대로 쓴다(ApiErrorView).
  if (isError) {
    return (
      <div className="w-full bg-surface-subtle rounded-2xl border border-line">
        <ApiErrorView error={error} compact />
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      {activeWishlistCount > 0 && (
        <div className="mb-6 flex items-center justify-between">
          <Text typography="t5" color="secondary">
            총 <span className="font-bold text-primary">{activeWishlistCount}</span>개의 관심 공연이 있습니다.
          </Text>
        </div>
      )}

      {/* 모바일 가로 리스트(SearchListCard) 렌더링 - md 미만에서만 표시 */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="w-full">
              <SearchListCard src="" title="" isLoading={true} />
            </div>
          ))
        ) : upcoming && upcoming.length > 0 ? (
          upcoming.map((item) => {
            const isRemoved = wishlistMap[item.id] === false;
            const isUpcomingOpen = item.openDate ? new Date(item.openDate).getTime() > now : false;
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
                  disabled={isUpcomingOpen}
                  showTime={isUpcomingOpen}
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
          <div className="w-full col-span-full flex flex-col items-center justify-center py-24 px-6 bg-surface-subtle rounded-2xl border border-line text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-content-muted mb-5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <Text typography="t5" fontWeight="bold" color="secondary" textAlign="center" className="mb-2 break-keep">
              관심 있는 공연이 없습니다.
            </Text>
            <Text typography="t6" color="tertiary" textAlign="center" className="break-keep max-w-none">
              홈 화면에서 기대되는 공연에 하트를 눌러보세요!
            </Text>
          </div>
        )}
      </div>

      {/* 태블릿/데스크톱 그리드 뷰 (InfoCard) - md 이상에서만 표시 */}
      <div className="hidden md:grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6 justify-items-center">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="w-full flex justify-center">
              <InfoCard className="!w-full !max-w-[260px] sm:!max-w-[300px]" src="" title="" isLoading={true} showTime={true} />
            </div>
          ))
        ) : upcoming && upcoming.length > 0 ? (
          upcoming.map((item) => {
            const isRemoved = wishlistMap[item.id] === false;
            const isUpcomingOpen = item.openDate ? new Date(item.openDate).getTime() > now : false;
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
                  disabled={isUpcomingOpen}
                  showTime={isUpcomingOpen}
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
          <div className="col-span-full w-full flex flex-col items-center justify-center py-24 px-6 bg-surface-subtle rounded-2xl border border-line text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-content-muted mb-5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <Text typography="t5" fontWeight="bold" color="secondary" textAlign="center" className="mb-2 break-keep">
              관심 있는 공연이 없습니다.
            </Text>
            <Text typography="t6" color="tertiary" textAlign="center" className="break-keep max-w-none">
              홈 화면에서 기대되는 공연에 하트를 눌러보세요!
            </Text>
          </div>
        )}
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
