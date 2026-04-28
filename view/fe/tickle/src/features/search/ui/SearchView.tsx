'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/src/shared/components/Header';
import { InfoCard } from '@/src/shared/components/InfoCard';
import { Title } from '@/src/shared/components/Title';
import { useSearchData } from '@/src/features/search/api/useSearchData';
import { createFavorite, deleteFavorite } from '@/src/shared/api/favoriteApi';

export const SearchView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams?.get('q') || '';
  
  const { data: results, isLoading } = useSearchData(query);
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());

  const handleCardClick = (id: string) => {
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
    <div className="flex h-screen bg-[#F2F4F6] text-gray-900 font-sans overflow-hidden">
      <main className="flex-1 h-full flex flex-col px-6 pt-0 pb-12 md:px-10 md:pb-16 overflow-y-auto transition-all duration-500 relative">
        <Header />

        <section className="mt-4 max-w-[1200px] w-full mx-auto">
          <div className="mb-8">
            <Title
              title={query ? `'${query}' 검색 결과` : '검색어를 입력해주세요'}
              bottomBorder={false}
              className="!bg-transparent [&>div]:!p-0 !text-2xl [&_h1]:!text-2xl"
            />
            {query && !isLoading && (
              <p className="text-gray-500 mt-2">총 {results?.length || 0}개의 공연이 검색되었습니다.</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="w-full">
                  <InfoCard src="" title="" isLoading={true} />
                </div>
              ))
            ) : results && results.length > 0 ? (
              results.map((item) => {
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
            ) : query ? (
              <div className="col-span-full py-20 text-center text-gray-500">
                검색 결과가 없습니다. 다른 검색어를 입력해보세요.
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
};
