import React from 'react';
import { Text } from '@/src/shared/components/Text';
import { InfoPoster } from '@/src/shared/components/InfoPoster';
import { BookingData } from '@/src/features/mypage/api/useMyPageData';

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

const formatDateOnly = (dateString: string) => {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
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

const isToday = (dateString: string) => {
  const today = new Date();
  const targetDate = new Date(dateString);
  return today.getFullYear() === targetDate.getFullYear() &&
    today.getMonth() === targetDate.getMonth() &&
    today.getDate() === targetDate.getDate();
};

interface MobileBookingCardProps {
  item: BookingData;
  onOpenPayment: (paymentId: number | null, bookingId: string) => void;
  onOpenCancel: (bookingId: string) => void;
  onOpenDetail: (bookingId: string) => void;
  onOpenBarcode: (barcodeText: string) => void;
}

export const MobileBookingCard = ({
  item,
  onOpenPayment,
  onOpenCancel,
  onOpenDetail,
  onOpenBarcode,
}: MobileBookingCardProps) => {

  const isPerformanceToday = isToday(item.performanceDate);

  const renderActions = () => {
    switch (item.status) {
      case 'PENDING_PAYMENT':
        return (
          <div className="flex gap-2 w-full mt-auto pt-3">
            <button
              onClick={() => onOpenPayment(item.paymentId || null, item.id)}
              className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white rounded-lg font-bold transition-colors text-xs shadow-sm"
            >
              결제 정보
            </button>
            <button
              onClick={() => onOpenCancel(item.id)}
              className="flex-1 py-2 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 border border-red-200 rounded-lg font-bold transition-colors text-xs shadow-sm"
            >
              예매 취소
            </button>
          </div>
        );
      case 'CONFIRMED':
      case 'BOOKED':
      case 'CANCELLED':
      default:
        return (
          <div className="flex w-full mt-auto pt-3">
            <button
              onClick={() => onOpenDetail(item.id)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-bold transition-colors text-xs shadow-sm"
            >
              상세 정보 {item.status !== 'CANCELLED' && '및 취소'}
            </button>
          </div>
        );
    }
  };

  return (
    <div className="relative w-full flex bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      
      {/* 좌측 영역 (티켓 스터브/포스터) */}
      <div className="w-[110px] shrink-0 p-3 pr-4 flex flex-col bg-gray-50/50">
        <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden shadow-sm border border-black/5 bg-gray-100">
          <InfoPoster src={item.imageUrl} alt={item.title} width="100%" height="100%" className="object-cover" />
        </div>
        
        {/* 바코드 미니 UI */}
        <div className="mt-3 flex flex-col items-center justify-center w-full">
          {isPerformanceToday ? (
            <div 
              className="flex flex-col items-center w-full cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
              onClick={() => onOpenBarcode(`${item.id.toUpperCase().replace('-', '')}8X9A`)}
            >
              <div className="h-4 w-full grayscale" style={{ backgroundImage: 'repeating-linear-gradient(to right, #1e293b, #1e293b 1px, transparent 1px, transparent 3px, #1e293b 3px, #1e293b 4px, transparent 4px, transparent 6px, #1e293b 6px, #1e293b 8px, transparent 8px, transparent 10px)' }}></div>
              <span className="text-[8px] tracking-[0.2em] font-mono mt-1 text-gray-500 font-bold w-full text-center truncate">CLICK</span>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full opacity-30 select-none">
              <div className="h-4 w-full grayscale" style={{ backgroundImage: 'repeating-linear-gradient(to right, #94a3b8, #94a3b8 1px, transparent 1px, transparent 3px, #94a3b8 3px, #94a3b8 4px, transparent 4px, transparent 6px, #94a3b8 6px, #94a3b8 8px, transparent 8px, transparent 10px)' }}></div>
              <span className="text-[8px] mt-1 text-gray-400 font-bold w-full text-center truncate">당일 활성</span>
            </div>
          )}
        </div>
      </div>

      {/* 절취선 (Perforation Line) */}
      <div className="relative w-0 border-l-2 border-dashed border-gray-200">
        {/* 상단 파인 부분 (반원) */}
        <div className="absolute top-[-1px] left-[-10px] w-[18px] h-[18px] bg-gray-50 rounded-full border-b border-gray-200 shadow-[inset_0_-2px_2px_rgba(0,0,0,0.02)] z-10" />
        {/* 하단 파인 부분 (반원) */}
        <div className="absolute bottom-[-1px] left-[-10px] w-[18px] h-[18px] bg-gray-50 rounded-full border-t border-gray-200 shadow-[inset_0_2px_2px_rgba(0,0,0,0.02)] z-10" />
      </div>

      {/* 우측 영역 (티켓 상세 정보) */}
      <div className="flex-1 flex flex-col p-4 pl-5 min-w-0 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] font-black text-blue-500 tracking-widest opacity-80">TICKET</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStatusBadge(item.status).color}`}>
            {getStatusBadge(item.status).text}
          </span>
        </div>
        
        <h3 className="text-[16px] font-bold text-gray-900 leading-snug mb-3 truncate">
          {item.title}
        </h3>
        
        <div className="flex flex-col gap-1.5 text-[13px] text-gray-600 font-medium">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span className="truncate">{formatDateOnly(item.performanceDate)} <span className="text-gray-400 font-normal mx-0.5">|</span> {formatTimeOnly(item.performanceDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span className="truncate">{item.venue}</span>
          </div>
        </div>

        {/* 액션 버튼 */}
        {renderActions()}
      </div>
    </div>
  );
};
