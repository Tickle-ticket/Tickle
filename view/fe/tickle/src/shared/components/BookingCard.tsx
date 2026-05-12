import React from 'react';
import { Text } from '@/src/shared/components/Text';
import { InfoPoster } from '@/src/shared/components/InfoPoster';
import { InfoTime } from '@/src/shared/components/InfoTime';
import { Table } from '@/src/shared/components/Table';
import { BookingData, useBookingDetail } from '@/src/features/mypage/api/useMyPageData';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PENDING_PAYMENT':
      return { text: '결제 대기', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    case 'CONFIRMED':
      return { text: '예매 완료', color: 'bg-green-100 text-green-700 border-green-200' };
    case 'CANCELLED':
      return { text: '예매 취소', color: 'bg-red-100 text-red-700 border-red-200' };
    default:
      return { text: status || '상태 없음', color: 'bg-gray-100 text-gray-700 border-gray-200' };
  }
};

const isToday = (dateString: string) => {
  const today = new Date();
  const targetDate = new Date(dateString);
  return today.getFullYear() === targetDate.getFullYear() &&
    today.getMonth() === targetDate.getMonth() &&
    today.getDate() === targetDate.getDate();
};

const formatDateOnly = (dateString: string) => {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return dateString;
  }
};

const formatTimeOnly = (dateString: string) => {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return dateString;
  }
};

interface BookingCardProps {
  item: BookingData;
  onOpenPayment: (paymentId: number | null, bookingId: string) => void;
  onOpenCancel: (bookingId: string) => void;
  onOpenDetail: (bookingId: string) => void;
  onOpenBarcode: (barcodeText: string) => void;
}

export const BookingCard = ({
  item,
  onOpenPayment,
  onOpenCancel,
  onOpenDetail,
  onOpenBarcode,
}: BookingCardProps) => {
  const [isFlipped, setIsFlipped] = React.useState(false);
  const isPerformanceToday = isToday(item.performanceDate);
  const { data: detail } = useBookingDetail(item.id);

  return (
    <div 
      className="relative w-full max-w-[260px] sm:max-w-[300px] mx-auto aspect-[1/1.55] sm:aspect-[2/3] cursor-pointer group"
      style={{ perspective: '1000px' }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div 
        className="w-full h-full relative rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-700 ease-in-out group-hover:shadow-[0_12px_40px_rgb(0,0,0,0.12)]"
        style={{ 
          transformStyle: 'preserve-3d', 
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
        }}
      >
        {/* 앞면: 포스터 */}
        <div 
          className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden bg-gray-100"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <InfoPoster src={item.imageUrl || ''} alt={item.title} width="100%" height="100%" className="absolute inset-0 object-cover" />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors" />
          
          <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4">
            <span className={`text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full shadow-md bg-white border-none ${getStatusBadge(item.status).text === '예매 취소' ? 'text-red-500' : 'text-blue-600'}`}>
              {getStatusBadge(item.status).text}
            </span>
          </div>
          
          <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            <Text as="p" typography="t5" fontWeight="bold" className="text-white w-full leading-normal mb-0.5 drop-shadow-md text-xs sm:text-base line-clamp-2 break-keep">
              {item.title}
            </Text>
            <Text typography="t7" fontWeight="medium" className="text-gray-200 line-clamp-2 break-keep drop-shadow-md text-[10px] sm:text-xs leading-normal">
              {item.venue}
            </Text>
          </div>
        </div>

        {/* 뒷면: 예매 정보 */}
        <div 
          className="absolute inset-0 w-full h-full bg-white rounded-2xl overflow-hidden border border-gray-200 flex flex-col p-2.5 sm:p-4 md:p-5 shadow-inner"
          style={{ 
            backfaceVisibility: 'hidden', 
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)' 
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5 sm:mb-3 shrink-0">
            <span className={`text-[7px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full border whitespace-nowrap ${getStatusBadge(item.status).color}`}>
              {getStatusBadge(item.status).text}
            </span>
            <span className="text-[7px] sm:text-[9px] font-extrabold text-blue-500/80 tracking-widest ml-auto bg-blue-50 px-1 sm:px-1.5 py-0.5 rounded-md">
              TICKET
            </span>
          </div>

          <Text as="p" typography="t5" fontWeight="bold" className="text-[#1e293b] w-full leading-snug mb-0.5 sm:mb-1.5 line-clamp-2 break-keep text-[11px] sm:text-[15px] shrink-0">
            {item.title}
          </Text>
          <Text typography="t7" fontWeight="medium" className="text-gray-500 line-clamp-1 break-keep mb-1.5 sm:mb-3 text-[9px] sm:text-[12px] leading-snug shrink-0">
            {item.venue}
          </Text>

          <div className="flex flex-col gap-1.5 sm:gap-2 mb-auto bg-gray-50 p-1.5 sm:p-3 md:p-4 rounded-xl border border-gray-100 shrink-0">
            <div className="flex gap-1.5 sm:gap-4">
              <div className="flex flex-col gap-0.5 w-1/2">
                <span className="text-[7px] sm:text-[10px] font-bold text-gray-400 tracking-wider">DATE</span>
                <span className="text-[10px] sm:text-[14px] font-extrabold text-gray-800">{formatDateOnly(item.performanceDate)}</span>
              </div>
              <div className="flex flex-col gap-0.5 w-1/2">
                <span className="text-[7px] sm:text-[10px] font-bold text-gray-400 tracking-wider">TIME</span>
                <span className="text-[10px] sm:text-[14px] font-extrabold text-gray-800">{formatTimeOnly(item.performanceDate)}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-0.5 sm:gap-1 w-full mt-0.5 sm:mt-1">
              <span className="text-[7px] sm:text-[10px] font-bold text-gray-400 tracking-wider">SEAT ({item.ticketCount}매)</span>
              {detail?.tickets && detail.tickets.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {detail.tickets.slice(0, 3).map((t: any, i: number) => (
                    <span key={i} className="text-[8px] sm:text-[11px] font-semibold text-gray-700 bg-white px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded border border-gray-200 whitespace-nowrap shadow-sm">
                      {t.sectionName} {t.rowLabel}열 {t.seatNumber}번
                    </span>
                  ))}
                  {detail.tickets.length > 3 && (
                    <span className="text-[8px] sm:text-[11px] font-bold text-gray-400 self-center">+{detail.tickets.length - 3}</span>
                  )}
                </div>
              ) : (
                <span className="text-[9px] sm:text-[12px] font-medium text-gray-500">{item.seatInfo}</span>
              )}
            </div>
          </div>

          {/* 하단 버튼 영역 */}
          <div className="flex flex-col gap-1 sm:gap-2 mt-1.5 sm:mt-3 pt-1.5 sm:pt-3 border-t border-gray-100 w-full relative z-10 shrink-0" onClick={(e) => e.stopPropagation()}>
             {item.status !== 'CANCELLED' && (
               <div className="flex gap-1.5 sm:gap-2 w-full">
                 {/* 결제 대기 시: 결제 정보 */}
                 {item.status === 'PENDING_PAYMENT' && (
                   <button 
                     onClick={(e) => { e.stopPropagation(); onOpenPayment(item.paymentId || null, item.id); }}
                     className="flex-1 py-1.5 sm:py-2 bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white rounded-lg font-bold transition-colors text-[10px] sm:text-xs shadow-sm"
                   >
                     결제하기
                   </button>
                 )}

                 {/* 예매 완료 시: 당일에만 바코드 버튼 */}
                 {(item.status === 'CONFIRMED' || item.status === 'BOOKED') && isPerformanceToday && (
                   <button
                     onClick={(e) => { e.stopPropagation(); onOpenBarcode(`${item.id.toUpperCase().replace('-', '')}8X9A`); }}
                     className="flex-1 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors text-[10px] sm:text-xs shadow-sm flex items-center justify-center gap-1"
                   >
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5v14M21 5v14M8 5v14M12 5v14M16 5v14"/></svg>
                     바코드
                   </button>
                 )}

                 {/* 공통: 예매 취소 */}
                 {(item.status === 'PENDING_PAYMENT' || item.status === 'CONFIRMED' || item.status === 'BOOKED') && (
                   <button 
                     onClick={(e) => { e.stopPropagation(); onOpenCancel(item.id); }}
                     className="flex-1 py-1.5 sm:py-2 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 border border-red-200 rounded-lg font-bold transition-colors text-[10px] sm:text-xs shadow-sm"
                   >
                     예매 취소
                   </button>
                 )}
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
