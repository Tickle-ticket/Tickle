import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Title } from '@/src/shared/components/Title';
import { InfoCard } from '@/src/shared/components/InfoCard';
import { useSearchData } from '@/src/features/search/api/useSearchData';
import { useSearchStore } from '@/src/shared/store/useSearchStore';
import { createFavorite, deleteFavorite } from '@/src/shared/api/favoriteApi';

interface SearchContentProps {
  query: string;
}

export const SearchContent: React.FC<SearchContentProps> = ({ query }) => {
  const router = useRouter();
  const { data: searchResults, isLoading: isSearchLoading } = useSearchData(query);
  const { clearSearch } = useSearchStore();
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());

  const handleCardClick = (id: string) => {
    clearSearch();
    router.push(`/detail?id=${id}`);
  };

  const handleWishlistToggle = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    try {
      if (wishlistedIds.has(eventId)) {
        await deleteFavorite(eventId);
      } else {
        await createFavorite(eventId);
      }
      setWishlistedIds((prev) => {
        const next = new Set(prev);
        if (next.has(eventId)) {
          next.delete(eventId);
        } else {
          next.add(eventId);
        }
        return next;
      });
    } catch (error) {
      console.error('찜 등록/취소 실패:', error);
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
            const isWishlisted = wishlistedIds.has(item.id);
            return (
              <div
                key={item.id}
                className="w-full cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                onClick={() => handleCardClick(item.id)}
              >
                <InfoCard
                  src={item.imageUrl}
                  title={item.title}
                  place={item.venue}
                  day={item.date}
                  showTime={!!item.openDate}
                  targetDate={item.openDate}
                  isWishlisted={isWishlisted}
                  onWishlistToggle={(e) => handleWishlistToggle(e, item.id)}
                  badges={item.badges.map((b) => ({
                    text: b,
                    color: b === 'HOT' ? 'red' : b === 'NEW' ? 'green' : b === 'BEST' ? 'blue' : 'grey' as any,
                    variant: 'fill' as const,
                  }))}
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
    </section>
  );
};

