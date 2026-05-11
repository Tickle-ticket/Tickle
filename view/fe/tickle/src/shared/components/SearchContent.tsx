'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Title } from '@/src/shared/components/Title';
import { InfoCard } from '@/src/shared/components/InfoCard';
import { SearchListCard } from '@/src/shared/components/SearchListCard';
import { useSearchData } from '@/src/features/search/api/useSearchData';
import { useSearchStore } from '@/src/shared/store/useSearchStore';
import { useDetailStore } from '@/src/shared/store/useDetailStore';
import { useWishlistStore } from '@/src/shared/store/useWishlistStore';
import { createFavorite, deleteFavorite } from '@/src/shared/api/favoriteApi';
import { useQueryClient } from '@tanstack/react-query';
import { getAccessToken } from '@/src/shared/api/tokenManager';
import { Modal } from '@/src/shared/components/Modal';
import { SearchBar } from '@/src/shared/components/SearchBar';
interface SearchContentProps {
  query: string;
  hideMobileSearchBar?: boolean;
}

export const SearchContent: React.FC<SearchContentProps> = ({ query, hideMobileSearchBar = false }) => {
  const router = useRouter();
  const { data: searchResults, isLoading: isSearchLoading } = useSearchData(query);
  const { clearSearch } = useSearchStore();
  const { openDetail } = useDetailStore();
  const { wishlistMap, addWishlist, removeWishlist } = useWishlistStore();
  const queryClient = useQueryClient();
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title: string; content: string; onConfirm?: () => void; confirmText?: string; showCancelButton?: boolean }>({ isOpen: false, title: '', content: '' });

  const { setSearchValue } = useSearchStore();
  const [inputValue, setInputValue] = useState(query === ' ' ? '' : query);

  React.useEffect(() => {
    if (query !== inputValue && query !== ' ' && inputValue !== '') {
      setInputValue(query === ' ' ? '' : query);
    }
  }, [query]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = inputValue.trim();
      if (trimmed && trimmed !== query) {
        setSearchValue(trimmed);
      } else if (!trimmed && query !== ' ' && inputValue === '') {
        setSearchValue(' ');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [inputValue, query, setSearchValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      setSearchValue(inputValue.trim());
    }
  };

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
      {/* Mobile & Tablet Search Bar - lg 미만에서만 표시 */}
      {!hideMobileSearchBar && (
        <div className="lg:hidden mb-8">
          <SearchBar
            autoFocus
            fullWidth
            size="medium"
            placeholder="검색어를 입력하세요..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onClear={() => {
              setInputValue('');
              setSearchValue(' ');
            }}
          />
        </div>
      )}

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

      {/* 모바일 가로 리스트(SearchListCard) 렌더링 - md 미만에서만 표시 */}
      <div className="flex flex-col gap-3 md:hidden pb-20">
        {isSearchLoading ? (
          Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="w-full">
              <SearchListCard src="" title="" isLoading={true} />
            </div>
          ))
        ) : searchResults && searchResults.length > 0 ? (
          searchResults.map((item) => {
            const isWishlisted = !!wishlistMap[item.id];
            return (
              <div
                key={item.id}
                className="w-full"
                onClick={() => handleCardClick(item.id, `poster-search-list-${item.id}`)}
              >
                <SearchListCard
                  layoutId={`poster-search-list-${item.id}`}
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
        ) : query !== ' ' ? (
          <div className="w-full py-20 text-center text-gray-500">
            검색 결과가 없습니다. 다른 검색어를 입력해보세요.
          </div>
        ) : null}
      </div>

      {/* 태블릿/데스크톱 그리드 뷰 (InfoCard) - md 이상에서만 표시 */}
      <div className="hidden md:grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 md:gap-6 xl:gap-8 pb-20 justify-items-center">
        {isSearchLoading ? (
          Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="w-full flex justify-center">
              <InfoCard src="" title="" isLoading={true} />
            </div>
          ))
        ) : searchResults && searchResults.length > 0 ? (
          searchResults.map((item) => {
            const isWishlisted = !!wishlistMap[item.id];
            return (
              <div
                key={item.id}
                className="w-full flex justify-center cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                onClick={() => handleCardClick(item.id, `poster-search-${item.id}`)}
              >
                <div className="w-full max-w-[280px]">
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
              </div>
            );
          })
        ) : query !== ' ' ? (
          <div className="w-full col-span-full flex flex-col items-center justify-center py-16 md:py-24 px-6 bg-gray-50 rounded-2xl border border-gray-200 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <Title className="mb-2 !p-0 !bg-transparent" title="검색 결과가 없습니다." bottomBorder={false} />
            <p className="text-gray-500 mt-2">다른 검색어를 입력해보세요.</p>
          </div>
        ) : null}
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

