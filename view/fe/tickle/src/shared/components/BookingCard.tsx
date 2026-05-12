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
  const isPerformanceToday = isToday(item.performanceDate);
  const { data: detail } = useBookingDetail(item.id);

  // 상태별 하단 액션 버튼 영역
  const renderActions = () => {
    switch (item.status) {
      case 'PENDING_PAYMENT':
        return (
          <>
            <button
              onClick={() => onOpenPayment(item.paymentId || null, item.id)}
              className="flex-1 py-2 sm:py-2.5 bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white rounded-xl font-bold transition-colors text-xs sm:text-sm shadow-sm"
            >
              결제 정보
            </button>
            <button
              onClick={() => onOpenCancel(item.id)}
              className="flex-1 py-2 sm:py-2.5 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 border border-red-200 rounded-xl font-bold transition-colors text-xs sm:text-sm shadow-sm"
            >
              예매 취소
            </button>
          </>
        );
      case 'CONFIRMED':
      case 'BOOKED':
        return (
          <button
            onClick={() => onOpenCancel(item.id)}
            className="flex-1 py-2 sm:py-2.5 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 border border-red-200 rounded-xl font-bold transition-colors text-xs sm:text-sm shadow-sm"
          >
            예매 취소
          </button>
        );
      case 'CANCELLED':
        return (
          <span className="text-[11px] font-medium text-gray-400">취소된 예매입니다</span>
        );
      default:
        return (
          <button
            onClick={() => onOpenDetail(item.id)}
            className="px-3 py-1.5 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-400 rounded-lg text-[11px] font-medium border border-gray-200 transition-colors"
          >
            상세 보기
          </button>
        );
    }
  };

  return (
    <div className={`relative w-full max-w-[600px] flex flex-row rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white transition-all hover:shadow-md ${!item.imageUrl ? '' : ''}`}>
      {/* 좌측: 포스터 영역 (이미지가 있을 때만 표시) */}
      {item.imageUrl ? (
        <div className="relative w-[110px] sm:w-[140px] shrink-0 bg-gray-100 border-r border-gray-100">
          <InfoPoster src={item.imageUrl} alt={item.title} width="100%" height="100%" className="rounded-none md:rounded-none h-full absolute inset-0 object-cover" />
        </div>
      ) : null}

      {/* 우측: 정보 및 액션 영역 */}
      <div className="flex flex-col flex-1 min-w-0 p-3 sm:p-5 relative">
        {/* 상단: 상태 및 티켓 라벨 */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(item.status).color}`}>
            {getStatusBadge(item.status).text}
          </span>
          <span className="text-[10px] font-extrabold text-blue-500/80 tracking-[0.2em] ml-auto bg-blue-50 px-2 py-0.5 rounded-md">
            TICKET
          </span>
        </div>

        {/* 중단: 공연 제목 및 장소 */}
        <Text as="p" typography="t4" fontWeight="bold" ellipsis className="text-[#1e293b] w-full leading-snug sm:leading-tight mb-1">
          {item.title}
        </Text>
        <Text typography="t7" fontWeight="medium" className="text-gray-500 truncate mb-3 sm:mb-4">
          {item.venue}
        </Text>

        {/* 하단: 날짜, 시간 */}
        <div className="flex gap-4 sm:gap-6 mb-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-gray-400">DATE</span>
            <span className="text-xs sm:text-sm font-extrabold text-gray-800">{formatDateOnly(item.performanceDate)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-gray-400">TIME</span>
            <span className="text-xs sm:text-sm font-extrabold text-gray-800">{formatTimeOnly(item.performanceDate)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-gray-400">QTY</span>
            <span className="text-xs sm:text-sm font-extrabold text-gray-800">{item.ticketCount}매</span>
          </div>
        </div>

        {/* 좌석 정보 (1줄 고정) */}
        <div className="flex items-center gap-1.5 mb-6 sm:mb-auto overflow-hidden">
          <span className="text-[10px] font-bold text-gray-400 shrink-0">SEAT</span>
          {detail?.tickets && detail.tickets.length > 0 ? (
            <div className="flex items-center gap-1 overflow-hidden">
              {detail.tickets.slice(0, 2).map((t: any, i: number) => (
                <span key={i} className="text-[10px] sm:text-[11px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 whitespace-nowrap shrink-0">
                  {t.sectionName} {t.rowLabel}열 {t.seatNumber}번
                </span>
              ))}
              {detail.tickets.length > 2 && (
                <span className="text-[10px] font-bold text-gray-400 shrink-0">+{detail.tickets.length - 2}</span>
              )}
            </div>
          ) : (
            <span className="text-xs font-medium text-gray-500">{item.seatInfo}</span>
          )}
        </div>

        {/* 점선 구분선 및 액션 버튼들 */}
        <div className="flex gap-2 sm:gap-3 mt-auto pt-3 sm:pt-4 border-t-2 border-dashed border-gray-100 relative">
          <div className="absolute top-[-10px] left-[-22px] sm:left-[-30px] w-5 h-5 bg-[#f8f8f8] rounded-full border-r-2 border-gray-100 shadow-[inset_-2px_0_3px_rgba(0,0,0,0.01)]" />
          
          {renderActions()}

          {/* 바코드 버튼 (우측 끝) */}
          {isPerformanceToday ? (
            <button
              onClick={() => onOpenBarcode(`${item.id.toUpperCase().replace('-', '')}8X9A`)}
              className="w-10 sm:w-12 shrink-0 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
              title="바코드 보기"
            >
              <div className="h-5 w-3/5 opacity-60 grayscale" style={{ backgroundImage: 'repeating-linear-gradient(to right, #1e293b, #1e293b 1px, transparent 1px, transparent 2px, #1e293b 2px, #1e293b 3px, transparent 3px, transparent 5px, #1e293b 5px, #1e293b 7px, transparent 7px, transparent 8px)' }}></div>
              <span className="text-[8px] sm:text-[9px] font-bold text-gray-500 mt-1">CODE</span>
            </button>
          ) : (
            <div
              className="w-10 sm:w-12 shrink-0 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-gray-100 opacity-50 cursor-not-allowed"
              title="관람 당일 활성화"
            >
              <div className="h-5 w-3/5 grayscale" style={{ backgroundImage: 'repeating-linear-gradient(to right, #94a3b8, #94a3b8 1px, transparent 1px, transparent 2px, #94a3b8 2px, #94a3b8 3px, transparent 3px, transparent 5px, #94a3b8 5px, #94a3b8 7px, transparent 7px, transparent 8px)' }}></div>
              <span className="text-[8px] font-bold text-gray-400 mt-1">D-DAY</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
