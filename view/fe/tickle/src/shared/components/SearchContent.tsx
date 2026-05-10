'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Title } from '@/src/shared/components/Title';
import { InfoCard } from '@/src/shared/components/InfoCard';
import { useSearchData } from '@/src/features/search/api/useSearchData';
import { useSearchStore } from '@/src/shared/store/useSearchStore';
import { useDetailStore } from '@/src/shared/store/useDetailStore';
import { useWishlistStore } from '@/src/shared/store/useWishlistStore';
import { createFavorite, deleteFavorite } from '@/src/shared/api/favoriteApi';
import { useQueryClient } from '@tanstack/react-query';
import { getAccessToken } from '@/src/shared/api/tokenManager';
import { Modal } from '@/src/shared/components/Modal';
interface SearchContentProps {
  query: string;
}

export const SearchContent: React.FC<SearchContentProps> = ({ query }) => {
  const router = useRouter();
  const { data: searchResults, isLoading: isSearchLoading } = useSearchData(query);
  const { clearSearch } = useSearchStore();
  const { openDetail } = useDetailStore();
  const { wishlistMap, addWishlist, removeWishlist } = useWishlistStore();
  const queryClient = useQueryClient();
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title: string; content: string; onConfirm?: () => void; confirmText?: string; showCancelButton?: boolean }>({ isOpen: false, title: '', content: '' });

  const handleCardClick = (id: string, layoutId: string) => {
    clearSearch();
    openDetail(id, layoutId);
  };

  const handleWishlistToggle = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();

    if (!getAccessToken()) {
      setModalConfig({ 
        isOpen: true, 
        title: '로그인 필요', 
        content: '로그인이 필요한 서비스입니다.',
        confirmText: '로그인 하기',
        showCancelButton: true,
        onConfirm: () => { 
          const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login?redirect=${currentPath}`;
        }
      });
      return;
    }

    const isWishlisted = !!wishlistMap[eventId];
    
    // 낙관적 업데이트
    if (isWishlisted) {
      removeWishlist(eventId);
    } else {
      addWishlist(eventId);
    }

    try {
      if (isWishlisted) {
        await deleteFavorite(Number(eventId));
      } else {
        await createFavorite(Number(eventId));
      }
      queryClient.invalidateQueries({ queryKey: ['myUpcomingWishlist'] });
    } catch (error) {
      console.error('찜 등록/취소 실패:', error);
      // 실패시 롤백
      if (isWishlisted) {
        addWishlist(eventId);
      } else {
        removeWishlist(eventId);
      }
    }
  };

  return (
    <section className="mt-4 w-full">
      <div className="mb-8">
        <Title
          title={`'${query}' 검색 결과`}
          bottomBorder={false}
          className="!bg-transparent [&>div]:!p-0 !text-2xl [&_h1]:!text-2xl"
        />
        {!isSearchLoading && (
          <p className="text-gray-500 mt-2">총 {searchResults?.length || 0}개의 공연이 검색되었습니다.</p>
        )}
      </div>

      {/* 화면 너비에 꽉 차도록 max-w 제한 제거 및 더 많은 열(xl:grid-cols-5, 2xl:grid-cols-6) 추가 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 xl:gap-8 pb-20">
        {isSearchLoading ? (
          Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="w-full">
              <InfoCard src="" title="" isLoading={true} />
            </div>
          ))
        ) : searchResults && searchResults.length > 0 ? (
          searchResults.map((item) => {
            const isWishlisted = !!wishlistMap[item.id];
            return (
              <div
                key={item.id}
                className="w-full cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                onClick={() => handleCardClick(item.id, `poster-search-${item.id}`)}
              >
                <InfoCard
                  layoutId={`poster-search-${item.id}`}
                  src={item.imageUrl}
                  title={item.title}
                  place={item.venue}
                  day={item.date}
                  showTime={!!item.openDate}
                  targetDate={item.openDate}
                  isWishlisted={isWishlisted}
                  onWishlistToggle={(e) => handleWishlistToggle(e, item.id)}
                  badges={item.badges}
                />
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-20 text-center text-gray-500">
            검색 결과가 없습니다. 다른 검색어를 입력해보세요.
          </div>
        )}
      </div>

      {/* 에러/로그인 모달 */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onConfirm={() => {
          setModalConfig({ ...modalConfig, isOpen: false });
          if (modalConfig.onConfirm) modalConfig.onConfirm();
        }}
        title={modalConfig.title}
        description={modalConfig.content}
        confirmText={modalConfig.confirmText || '확인'}
        showCancelButton={modalConfig.showCancelButton ?? false}
      />
    </section>
  );
};

