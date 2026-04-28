'use client';

import React, { useState } from 'react';
import { useMyBookings, useCancelBooking } from '@/src/features/mypage/api/useMyPageData';
import { Text } from '@/src/shared/components/Text';
import { InfoPoster } from '@/src/shared/components/InfoPoster';
import { InfoTime } from '@/src/shared/components/InfoTime';
import { Table } from '@/src/shared/components/Table';
import { Modal } from '@/src/shared/components/Modal';
import { BookView } from '@/src/features/book/ui/BookView';
import { QueueView } from '@/src/features/queue/ui/QueueView';

const isToday = (dateString: string) => {
  const today = new Date();
  const targetDate = new Date(dateString);
  return today.getFullYear() === targetDate.getFullYear() &&
         today.getMonth() === targetDate.getMonth() &&
         today.getDate() === targetDate.getDate();
};

export const MyBookingsView = () => {
  const { data: bookings, isLoading } = useMyBookings();
  const { mutate: cancelBooking, isPending: isCanceling } = useCancelBooking();

  const [modifyFlowState, setModifyFlowState] = useState<'NONE' | 'QUEUE' | 'BOOK'>('NONE');
  const [selectedBookingForModify, setSelectedBookingForModify] = useState<{ id: string, date: string, time: string, initialSeats: string[] } | null>(null);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<{ id: string, initialSeats: string[] } | null>(null);
  const [seatsToCancel, setSeatsToCancel] = useState<Set<string>>(new Set());

  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [selectedBarcodeText, setSelectedBarcodeText] = useState<string | null>(null);

  const handleOpenBarcodeModal = (barcodeText: string) => {
    setSelectedBarcodeText(barcodeText);
    setIsBarcodeModalOpen(true);
  };

  const handleCloseBarcodeModal = () => {
    setIsBarcodeModalOpen(false);
    setSelectedBarcodeText(null);
  };

  const getDetailedSeatInfo = (seatId: string) => {
    const match = seatId.match(/([a-zA-Z]+)(\d+)/);
    if (!match) return seatId;
    const num = parseInt(match[2], 10) || 1;
    
    const floor = num > 50 ? 2 : 1;
    const zones = ['A', 'B', 'C', 'D', 'E'];
    const zone = zones[(num - 1) % 5];
    const row = Math.ceil(num / 15) + (floor === 1 ? 5 : 1);
    const seatNum = num;
    
    return `${floor}층 ${zone}구역 ${row}열 ${seatNum}번`;
  };

  const handleOpenCancelModal = (item: any) => {
    const match = item.seatInfo.match(/([A-Z]+)석\s+(\d+)매/);
    const grade = match ? match[1] : 'VIP';
    const count = match ? parseInt(match[2], 10) : 1;
    const initialSeats = Array.from({ length: count }).map((_, i) => `${grade}${i + 1}`);

    setSelectedBookingForCancel({ id: item.id, initialSeats });
    setSeatsToCancel(new Set()); 
    setIsCancelModalOpen(true);
  };

  const handleCloseCancelModal = () => {
    setIsCancelModalOpen(false);
    setSelectedBookingForCancel(null);
    setSeatsToCancel(new Set());
  };

  const handleConfirmCancel = () => {
    if (selectedBookingForCancel) {
      cancelBooking(selectedBookingForCancel.id, {
        onSuccess: () => {
          handleCloseCancelModal();
        }
      });
    }
  };

  const handleOpenModifyFlow = (item: any) => {
    // 임의의 좌석 데이터 생성 로직 (seatInfo 파싱 후 임시 좌석 ID 주입)
    const match = item.seatInfo.match(/([A-Z]+)석\s+(\d+)매/);
    const grade = match ? match[1] : 'VIP';
    const count = match ? parseInt(match[2], 10) : 1;
    const initialSeats = Array.from({ length: count }).map((_, i) => `${grade}${i + 1}`);
    
    // date와 time 분리
    const d = new Date(item.performanceDate);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}.${month}.${day}`;
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    setSelectedBookingForModify({
      id: item.id,
      date: dateStr,
      time: timeStr,
      initialSeats,
    });
    setModifyFlowState('QUEUE');
  };

  const handleCloseModifyFlow = () => {
    setModifyFlowState('NONE');
    setSelectedBookingForModify(null);
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <Text typography="t5" color="secondary">
          총 <span className="font-bold text-blue-600">{bookings?.length || 0}</span>건의 예매 내역이 있습니다.
        </Text>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20 justify-items-center">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="w-full h-[400px] bg-gray-100 animate-pulse rounded-2xl" />
          ))
        ) : bookings && bookings.length > 0 ? (
          bookings.map((item) => {
            const isPerformanceToday = isToday(item.performanceDate);
            return (
              <div
                key={item.id}
                className="relative w-full max-w-[280px] flex flex-col rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white"
              >
                {/* 포스터 및 카운트다운 영역 */}
                <div className="relative w-full aspect-[2/3] overflow-hidden bg-gray-100 border-b border-gray-200">
                  {/* 하단 텍스트 가독성을 위한 그라데이션 오버레이 */}
                  <div className="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10"></div>
                  <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                    <InfoTime targetDate={item.performanceDate} className="pointer-events-auto" />
                  </div>
                  <InfoPoster src={item.imageUrl} alt={item.title} width="100%" height="100%" className="rounded-none md:rounded-none max-w-full" />
                </div>

                <div className="flex flex-col w-full bg-white">
                  {/* 공연 이름 및 장소 (고급스러운 타이포그래피와 아이콘 적용) */}
                  <div className="w-full flex flex-col items-center justify-center pt-5 pb-4 px-5 bg-white">
                    <div className="flex flex-col items-center w-full mb-2">
                      <span className="text-[10px] font-extrabold text-blue-500 tracking-[0.2em] mb-1 opacity-80">BOOKING TICKET</span>
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

                  {/* 바코드 UI (기존 취소하기 버튼 자리) */}
                  <div className="w-full px-5 pb-4">
                    {isPerformanceToday ? (
                      <div 
                        className="flex flex-col items-center justify-center pt-3 pb-2 cursor-pointer hover:bg-gray-50 transition-colors rounded-xl border border-gray-100"
                        onClick={() => handleOpenBarcodeModal(`${item.id.toUpperCase().replace('-', '')}8X9A`)}
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

                  {/* 하단 기타 정보 (Table 컴포넌트 사용, 프리미엄 티켓 스타일) */}
                  <div className="w-full bg-white px-4 pb-4 pt-5 border-t-2 border-dashed border-gray-200 relative mt-auto">
                    {/* 티켓 펀치홀 효과 (음영 처리로 리얼리티 강화) */}
                    <div className="absolute top-[-8px] left-[-12px] w-6 h-6 bg-[#f8f8f8] rounded-full border-r border-gray-200 shadow-[inset_-2px_0_3px_rgba(0,0,0,0.03)]" />
                    <div className="absolute top-[-8px] right-[-12px] w-6 h-6 bg-[#f8f8f8] rounded-full border-l border-gray-200 shadow-[inset_2px_0_3px_rgba(0,0,0,0.03)]" />
                    
                    <div className="bg-[#f8fafc] rounded-xl overflow-hidden border border-[#e2e8f0] shadow-sm">
                      <Table 
                        columns={[
                          { key: 'bookingDate', header: '예매일', align: 'center' },
                          { key: 'performanceDate', header: '관람일', align: 'center' },
                          { key: 'seatInfo', header: '좌석', align: 'center' }
                        ]} 
                        data={[{
                          bookingDate: item.bookingDate.replace('2025-', '').replace('-', '.'),
                          performanceDate: item.performanceDate.split('T')[0].replace('2025-', '').replace('-', '.'),
                          seatInfo: item.seatInfo.split(' ')[0]
                        }]} 
                        tableLayout="fixed"
                        className="[&_thead]:!bg-[#f1f5f9] [&_thead]:!border-b [&_thead]:!border-[#e2e8f0] [&_tbody]:!divide-none hover:[&_tr]:!bg-transparent [&_th]:!py-2 [&_th]:!px-1 [&_td]:!py-2.5 [&_td]:!px-1 [&_th_span]:!text-[11px] [&_th_span]:!font-bold [&_th_span]:!text-[#64748b] [&_td_span]:!text-[12px] [&_td_span]:!font-extrabold [&_td_span]:!text-[#334155]"
                      />
                    </div>

                    {/* 하단 액션 버튼들 */}
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => handleOpenCancelModal(item)}
                        className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100 rounded-xl font-bold transition-colors text-sm"
                      >
                        취소하기
                      </button>
                      <button 
                        onClick={() => handleOpenModifyFlow(item)}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold transition-colors text-sm shadow-sm"
                      >
                        일정 변경
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full w-full flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-gray-200">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-4">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
              <path d="M13 5v2"></path>
              <path d="M13 17v2"></path>
              <path d="M13 11v2"></path>
            </svg>
            <Text typography="t5" fontWeight="bold" color="secondary" className="mb-1">예매 내역이 없습니다.</Text>
            <Text typography="t6" color="tertiary">새로운 공연을 예매해 보세요!</Text>
          </div>
        )}
      </div>

      {modifyFlowState === 'QUEUE' && selectedBookingForModify && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <QueueView 
            sessionId={selectedBookingForModify.id || '1'} 
            onAdmitted={(token) => {
              setModifyFlowState('BOOK');
            }}
            onClose={() => setModifyFlowState('NONE')}
          />
        </div>
      )}

      {modifyFlowState === 'BOOK' && selectedBookingForModify && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <BookView 
            mode="CANCEL" 
            initialSchedule={{ date: selectedBookingForModify.date, time: selectedBookingForModify.time }}
            initialSeats={selectedBookingForModify.initialSeats}
            initialModifyModeActive={true}
            onClose={() => {
              handleCloseModifyFlow();
            }} 
          />
        </div>
      )}

      <Modal
        isOpen={isCancelModalOpen}
        onClose={handleCloseCancelModal}
        onCancel={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
        title="예매 취소"
        description="취소하실 좌석을 선택해주세요. 취소된 예매는 복구할 수 없습니다."
        confirmText={isCanceling ? "취소 중..." : "예매 취소하기"}
        cancelText="닫기"
        isLoading={isCanceling}
        isConfirmDisabled={seatsToCancel.size === 0}
      >
        <div className="mt-4 flex flex-col gap-2 w-full">
          {selectedBookingForCancel?.initialSeats.map(seat => (
            <label key={seat} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                checked={seatsToCancel.has(seat)}
                onChange={(e) => {
                  setSeatsToCancel(prev => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(seat);
                    else next.delete(seat);
                    return next;
                  });
                }}
              />
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-gray-900 dark:text-white text-[15px]">
                  {seat.match(/([a-zA-Z]+)/)?.[1]?.toUpperCase() || 'VIP'}석
                </span>
                <span className="text-gray-400 dark:text-gray-500 font-medium text-[12px]">
                  {getDetailedSeatInfo(seat)}
                </span>
              </div>
            </label>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={isBarcodeModalOpen}
        onClose={handleCloseBarcodeModal}
        showCancelButton={false}
        confirmText="닫기"
        onConfirm={handleCloseBarcodeModal}
        title="티켓 바코드"
      >
        <div className="flex flex-col items-center justify-center py-6 w-full">
          <div className="h-20 w-full opacity-80" style={{ backgroundImage: 'repeating-linear-gradient(to right, #1e293b, #1e293b 3px, transparent 3px, transparent 6px, #1e293b 6px, #1e293b 8px, transparent 8px, transparent 12px, #1e293b 12px, #1e293b 16px, transparent 16px, transparent 20px)' }}></div>
          <div className="text-lg tracking-[0.4em] text-gray-800 mt-4 font-mono font-bold">{selectedBarcodeText}</div>
        </div>
      </Modal>
    </div>
  );
};
