'use client';

import React from 'react';
import { usePastBookings } from '@/src/features/mypage/api/useMyPageData';
import { Text } from '@/src/shared/components/Text';
import { InfoPoster } from '@/src/shared/components/InfoPoster';
import { Table } from '@/src/shared/components/Table';

export const PastBookingsView = () => {
  const { data: bookings, isLoading } = usePastBookings();

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <Text typography="t5" color="secondary">
          총 <span className="font-bold text-blue-600">{bookings?.length || 0}</span>건의 과거 예매 내역이 있습니다.
        </Text>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20 justify-items-center">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="w-full h-[400px] bg-gray-100 animate-pulse rounded-2xl" />
          ))
        ) : bookings && bookings.length > 0 ? (
          bookings.map((item) => {
            return (
              <div
                key={item.id}
                className="relative w-full max-w-[280px] flex flex-col rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white"
              >
                {/* 포스터 영역 (카운트다운 없음) */}
                <div className="relative w-full aspect-[2/3] overflow-hidden bg-gray-100 border-b border-gray-200">
                  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-black/20">
                    <div className="px-4 py-2 bg-black/60 rounded-full backdrop-blur-sm border border-white/20">
                      <Text typography="t6" fontWeight="bold" className="text-white tracking-widest">
                        관람 완료
                      </Text>
                    </div>
                  </div>
                  <InfoPoster src={item.imageUrl} alt={item.title} width="100%" height="100%" className="rounded-none md:rounded-none max-w-full" />
                </div>

                <div className="flex flex-col w-full bg-white">
                  {/* 공연 이름 및 장소 (고급스러운 타이포그래피와 아이콘 적용) */}
                  <div className="w-full flex flex-col items-center justify-center pt-5 pb-4 px-5 bg-white">
                    <div className="flex flex-col items-center w-full mb-2">
                      <span className="text-[10px] font-extrabold text-gray-400 tracking-[0.2em] mb-1 opacity-80">PAST TICKET</span>
                      <Text typography="t4" fontWeight="bold" textAlign="center" className="text-[#1e293b] w-full truncate px-1">
                        {item.title}
                      </Text>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 mt-1.5 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                      <Text typography="t7" fontWeight="medium" className="truncate text-gray-600">
                        {item.venue}
                      </Text>
                    </div>
                  </div>

                  {/* 와이어프레임의 '예매 기간' 블록 (Cyan 색상 테마) */}
                  <div className="w-full flex items-center justify-center py-2.5 bg-[#e0f2fe] border-y border-[#bae6fd]">
                    <Text typography="t6" fontWeight="bold" className="text-[#0369a1]">
                      관람일: {new Date(item.performanceDate).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                    </Text>
                  </div>

                  {/* 하단 기타 정보 (Table 컴포넌트 사용, 프리미엄 티켓 스타일) */}
                  <div className="w-full bg-white px-4 pb-3 pt-5 relative mt-auto border-t-2 border-dashed border-gray-200">
                    {/* 티켓 펀치홀 효과 (음영 처리로 리얼리티 강화) */}
                    <div className="absolute top-[-8px] left-[-12px] w-6 h-6 bg-[#f8f8f8] rounded-full border-r border-gray-200 shadow-[inset_-2px_0_3px_rgba(0,0,0,0.03)]" />
                    <div className="absolute top-[-8px] right-[-12px] w-6 h-6 bg-[#f8f8f8] rounded-full border-l border-gray-200 shadow-[inset_2px_0_3px_rgba(0,0,0,0.03)]" />
                    
                    <div className="bg-[#f8fafc] rounded-xl overflow-hidden border border-[#e2e8f0] shadow-sm mb-3">
                      <Table 
                        columns={[
                          { key: 'bookingDate', header: '예매일', align: 'center' },
                          { key: 'ticketCount', header: '매수', align: 'center' },
                          { key: 'seatInfo', header: '좌석', align: 'center' }
                        ]} 
                        data={[{
                          bookingDate: item.bookingDate.replace('2025-', '').replace('2024-', '').replace('2023-', '').replace('-', '.'),
                          ticketCount: `${item.ticketCount}매`,
                          seatInfo: item.seatInfo.split(' ')[0]
                        }]} 
                        tableLayout="fixed"
                        className="[&_thead]:!bg-[#f1f5f9] [&_thead]:!border-b [&_thead]:!border-[#e2e8f0] [&_tbody]:!divide-none hover:[&_tr]:!bg-transparent [&_th]:!py-2 [&_th]:!px-1 [&_td]:!py-2.5 [&_td]:!px-1 [&_th_span]:!text-[11px] [&_th_span]:!font-bold [&_th_span]:!text-[#64748b] [&_td_span]:!text-[12px] [&_td_span]:!font-extrabold [&_td_span]:!text-[#334155]"
                      />
                    </div>


                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full w-full flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-gray-200">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-4">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <Text typography="t5" fontWeight="bold" color="secondary" className="mb-1">과거 예매 내역이 없습니다.</Text>
            <Text typography="t6" color="tertiary">새로운 공연을 예매해 보세요!</Text>
          </div>
        )}
      </div>
    </div>
  );
};
