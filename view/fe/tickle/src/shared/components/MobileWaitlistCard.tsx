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
    <div className="w-full flex flex-col bg-zinc-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden p-3 gap-3">
      {/* 상단: 이미지 + 정보 */}
      <div className="flex gap-3 items-start">
        {/* 좌측: 포스터 */}
        <div className="relative w-[76px] h-[104px] shrink-0 rounded-xl overflow-hidden shadow-md bg-black">
          <InfoPoster src={item.imageUrl} alt={item.title} width="100%" height="100%" className="object-cover" />
          <div className="absolute top-1 left-1 right-1">
            <span className="block text-center px-1 py-0.5 bg-purple-500/90 text-white rounded-[6px] text-[9px] font-black tracking-widest backdrop-blur-md shadow-sm border border-purple-400/50">
              대기중
            </span>
          </div>
        </div>

        {/* 우측: 정보 및 좌석 대기열 */}
        <div className="flex flex-col flex-1 min-w-0">
          <Text typography="t5" fontWeight="bold" className="text-white w-full truncate mb-1 leading-tight drop-shadow-sm">
            {item.title}
          </Text>
          <div className="flex flex-col gap-0.5 text-[11px] text-gray-300 font-medium tracking-tight">
            <span>{new Date(item.performanceDate).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {/* 좌석 리스트 */}
          <div className="flex flex-col gap-1.5 mt-2.5">
            {item.seats && item.seats.map((seat: any) => {
              const progress = Math.max(5, 100 - (seat.waitlistNumber * 2));
              let badgeClass = '';
              let barClass = '';

              if (seat.waitlistNumber <= 0) {
                badgeClass = 'bg-rose-500 text-white border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]';
                barClass = 'bg-gradient-to-r from-rose-600 to-rose-400';
              } else if (seat.waitlistNumber <= 5) {
                badgeClass = 'bg-blue-500/30 text-blue-200 border-blue-400/50';
                barClass = 'bg-gradient-to-r from-blue-600 to-blue-400';
              } else if (seat.waitlistNumber <= 10) {
                badgeClass = 'bg-green-500/30 text-green-200 border-green-400/50';
                barClass = 'bg-gradient-to-r from-green-600 to-green-400';
              } else if (seat.waitlistNumber <= 15) {
                badgeClass = 'bg-yellow-500/30 text-yellow-200 border-yellow-400/50';
                barClass = 'bg-gradient-to-r from-yellow-600 to-yellow-400';
              } else {
                badgeClass = 'bg-red-500/30 text-red-200 border-red-400/50';
                barClass = 'bg-gradient-to-r from-red-600 to-red-400';
              }

              const isOffered = seat.waitlistNumber <= 0;

              return (
                <div key={seat.id} className={`flex flex-col bg-black/40 p-2 rounded-lg border ${isOffered ? 'border-rose-500/60 shadow-inner' : 'border-white/5'}`}>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-100 font-semibold truncate pr-2">{seat.info}</span>
                    <span className={`px-1.5 py-0.5 rounded-[4px] border font-black whitespace-nowrap tracking-tight ${badgeClass}`}>
                      {isOffered ? '배정됨!' : `대기 ${seat.waitlistNumber}번`}
                    </span>
                  </div>
                  {!isOffered && (
                    <div className="w-full h-[3px] bg-white/10 rounded-full mt-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${barClass}`} style={{ width: `${progress}%` }} />
                    </div>
                  )}
                  {isOffered && (
                    <button
                      onClick={() => setSelectedOfferId(seat.id)}
                      className="w-full py-1.5 mt-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-[6px] text-[10px] font-extrabold transition-colors shadow-sm"
                    >
                      상세 확인 및 결제
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <button
        onClick={() => onOpenDetail(item)}
        className="w-full py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/20 text-white text-[13px] font-bold rounded-xl border border-white/10 transition-colors shadow-sm"
      >
        상세 및 대기 취소
      </button>
    </div>
  );
};
