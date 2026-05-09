import React from 'react';
import { Text } from '@/src/shared/components/Text';
import { InfoPoster } from '@/src/shared/components/InfoPoster';
import { InfoTime } from '@/src/shared/components/InfoTime';
import { Table } from '@/src/shared/components/Table';
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

  // 상태별 하단 액션 버튼 영역
  const renderActions = () => {
    switch (item.status) {
      case 'PENDING_PAYMENT':
        return (
          <>
            <button
              onClick={() => {
                onOpenPayment(item.paymentId || null, item.id);
              }}
              className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white rounded-xl font-bold transition-colors text-sm shadow-sm"
            >
              결제 정보
            </button>
            <button
              onClick={() => onOpenCancel(item.id)}
              className="flex-1 py-3 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 border border-red-200 rounded-xl font-bold transition-colors text-sm shadow-sm"
            >
              예매 취소
            </button>
          </>
        );
      case 'CONFIRMED':
      case 'BOOKED':
      case 'CANCELLED':
      default:
        return (
          <button
            onClick={() => onOpenDetail(item.id)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold transition-colors text-sm shadow-sm"
          >
            상세 정보 {item.status !== 'CANCELLED' && '및 취소'}
          </button>
        );
    }
  };

  return (
    <div className="relative w-full max-w-[280px] flex flex-col rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white">
      {/* 포스터 및 카운트다운 영역 */}
      <div className="relative w-full aspect-[2/3] overflow-hidden bg-gray-100 border-b border-gray-200">
        <div className="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10"></div>
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <InfoTime targetDate={item.performanceDate} className="pointer-events-auto" />
        </div>
        <InfoPoster src={item.imageUrl} alt={item.title} width="100%" height="100%" className="rounded-none md:rounded-none max-w-full" />
      </div>

      <div className="flex flex-col w-full bg-white">
        {/* 공연 이름 및 장소 */}
        <div className="w-full flex flex-col items-center justify-center pt-5 pb-4 px-5 bg-white">
          <div className="flex flex-col items-center w-full mb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold text-blue-500 tracking-[0.2em] opacity-80">BOOKING TICKET</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(item.status).color}`}>
                {getStatusBadge(item.status).text}
              </span>
            </div>
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

        {/* 바코드 UI */}
        <div className="w-full px-5 pb-4">
          {isPerformanceToday ? (
            <div
              className="flex flex-col items-center justify-center pt-3 pb-2 cursor-pointer hover:bg-gray-50 transition-colors rounded-xl border border-gray-100"
              onClick={() => onOpenBarcode(`${item.id.toUpperCase().replace('-', '')}8X9A`)}
              title="바코드 크게 보기"
            >
              <div className="h-8 w-4/5 opacity-40 grayscale" style={{ backgroundImage: 'repeating-linear-gradient(to right, #1e293b, #1e293b 2px, transparent 2px, transparent 4px, #1e293b 4px, #1e293b 5px, transparent 5px, transparent 8px, #1e293b 8px, #1e293b 11px, transparent 11px, transparent 13px)' }}></div>
              <div className="text-[10px] tracking-[0.4em] text-gray-400 mt-2 font-mono font-semibold">{item.id.toUpperCase().replace('-', '')}8X9A</div>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center pt-3 pb-2 rounded-xl border border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed select-none"
              title="관람 당일에 바코드가 활성화됩니다"
            >
              <div className="h-8 w-4/5 grayscale" style={{ backgroundImage: 'repeating-linear-gradient(to right, #94a3b8, #94a3b8 2px, transparent 2px, transparent 4px, #94a3b8 4px, #94a3b8 5px, transparent 5px, transparent 8px, #94a3b8 8px, #94a3b8 11px, transparent 11px, transparent 13px)' }}></div>
              <div className="text-[10px] tracking-[0.1em] text-gray-400 mt-2 font-bold">관람 당일 활성화</div>
            </div>
          )}
        </div>

        {/* 하단 기타 정보 */}
        <div className="w-full bg-white px-4 pb-4 pt-5 border-t-2 border-dashed border-gray-200 relative mt-auto">
          <div className="absolute top-[-8px] left-[-12px] w-6 h-6 bg-[#f8f8f8] rounded-full border-r border-gray-200 shadow-[inset_-2px_0_3px_rgba(0,0,0,0.03)]" />
          <div className="absolute top-[-8px] right-[-12px] w-6 h-6 bg-[#f8f8f8] rounded-full border-l border-gray-200 shadow-[inset_2px_0_3px_rgba(0,0,0,0.03)]" />

          <div className="bg-[#f8fafc] rounded-xl overflow-hidden border border-[#e2e8f0] shadow-sm">
            <Table
              columns={[
                { key: 'perfDate', header: '관람 일자', align: 'center' },
                { key: 'perfTime', header: '관람 시간', align: 'center' }
              ]}
              data={[{
                perfDate: formatDateOnly(item.performanceDate),
                perfTime: formatTimeOnly(item.performanceDate)
              }]}
              tableLayout="fixed"
              className="[&_thead]:!bg-[#f1f5f9] [&_thead]:!border-b [&_thead]:!border-[#e2e8f0] [&_tbody]:!divide-none hover:[&_tr]:!bg-transparent [&_th]:!py-2 [&_th]:!px-1 [&_td]:!py-2.5 [&_td]:!px-1 [&_th_span]:!text-[11px] [&_th_span]:!font-bold [&_th_span]:!text-[#64748b] [&_td_span]:!text-[12px] [&_td_span]:!font-extrabold [&_td_span]:!text-[#334155]"
            />
          </div>

          {/* 하단 액션 버튼들 */}
          <div className="flex gap-2 mt-4">
            {renderActions()}
          </div>
        </div>
      </div>
    </div>
  );
};
