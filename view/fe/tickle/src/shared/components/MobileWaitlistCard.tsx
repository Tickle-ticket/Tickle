import React from 'react';
import { Text } from '@/src/shared/components/Text';
import { InfoPoster } from '@/src/shared/components/InfoPoster';
import { WaitlistBookingData } from '@/src/features/mypage/api/useMyPageData';

interface MobileWaitlistCardProps {
  item: WaitlistBookingData;
  onOpenDetail: (item: WaitlistBookingData) => void;
  setSelectedOfferId: (id: string) => void;
}

export const MobileWaitlistCard = ({ item, onOpenDetail, setSelectedOfferId }: MobileWaitlistCardProps) => {
  return (
    <div className="w-full flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm transition-shadow overflow-hidden p-4">
      {/* 상단: 대시보드 헤더 */}
      <div className="flex gap-3 items-center mb-4 pb-3 border-b border-gray-100">
        {/* 미니 썸네일 */}
        <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden shadow-sm border border-gray-100 bg-gray-50">
          <InfoPoster src={item.imageUrl} alt={item.title} width="100%" height="100%" className="object-cover" />
        </div>

        {/* 정보 영역 */}
        <div className="flex flex-col flex-1 min-w-0">
          <Text typography="t5" fontWeight="bold" className="text-gray-900 w-full truncate mb-0.5 leading-tight">
            {item.title}
          </Text>
          <div className="text-[11px] text-gray-500 font-medium tracking-tight">
            <span>{new Date(item.performanceDate).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* 상단 액션 (취소) */}
        <button
          onClick={() => onOpenDetail(item)}
          className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-600 text-[11px] font-bold rounded-lg border border-gray-200 transition-colors shrink-0"
        >
          취소
        </button>
      </div>

      {/* 하단: 내 좌석 대기열 그리드 (Queue Number Cards) */}
      <div className="grid grid-cols-2 gap-2.5">
        {item.seats && item.seats.map((seat: any) => {
          const isOffered = seat.waitlistNumber <= 0;
          
          let numColor = '';
          let ringColor = '';
          let bgColor = '';
          
          if (isOffered) {
            numColor = 'text-rose-500';
            ringColor = 'border-rose-300 shadow-[0_0_8px_rgba(225,29,72,0.15)]';
            bgColor = 'bg-rose-50/50 border-rose-200';
          } else if (seat.waitlistNumber <= 3) {
            numColor = 'text-blue-600';
            ringColor = 'border-blue-300';
            bgColor = 'bg-blue-50/40 border-blue-100';
          } else if (seat.waitlistNumber <= 10) {
            numColor = 'text-emerald-600';
            ringColor = 'border-emerald-300';
            bgColor = 'bg-emerald-50/40 border-emerald-100';
          } else if (seat.waitlistNumber <= 15) {
            numColor = 'text-amber-600';
            ringColor = 'border-amber-300';
            bgColor = 'bg-amber-50/40 border-amber-100';
          } else {
            numColor = 'text-red-500';
            ringColor = 'border-red-300';
            bgColor = 'bg-red-50/40 border-red-100';
          }

          return (
            <div key={seat.id} className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${bgColor}`}>
              {/* 대기 순번 숫자 (Hero Number) */}
              <div className={`w-11 h-11 rounded-full border-[2.5px] flex items-center justify-center mb-1.5 bg-white ${ringColor}`}>
                {isOffered ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <span className={`text-lg font-black ${numColor}`}>{seat.waitlistNumber}</span>
                )}
              </div>
              
              {/* 상태 라벨 */}
              <span className={`text-[10px] font-extrabold mb-1 ${isOffered ? 'text-rose-500' : 'text-gray-500'}`}>
                {isOffered ? '배정 완료!' : '번째 대기 중'}
              </span>
              
              {/* 좌석 정보 (보조 텍스트) */}
              <span className="text-[9px] font-medium text-gray-400 truncate w-full px-0.5" title={seat.info}>
                {seat.info}
              </span>
              
              {/* 배정된 좌석은 결제 버튼 */}
              {isOffered && (
                <button
                  onClick={() => setSelectedOfferId(seat.id)}
                  className="w-full py-1.5 mt-2 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition-all"
                >
                  결제하기
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
