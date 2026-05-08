'use client';

import React, { useState, useEffect } from 'react';
import { useMyBookings, useCancelBooking, useBookingDetail } from '@/src/features/mypage/api/useMyPageData';
import { Text } from '@/src/shared/components/Text';
import { InfoPoster } from '@/src/shared/components/InfoPoster';
import { InfoTime } from '@/src/shared/components/InfoTime';
import { Table } from '@/src/shared/components/Table';
import { Modal } from '@/src/shared/components/Modal';

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

export const MyBookingsView = () => {
  const { data: bookings, isLoading } = useMyBookings();
  const { mutate: cancelBooking, isPending: isCanceling } = useCancelBooking();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<{ id: string } | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);

  const { data: bookingDetail, isLoading: isDetailLoading, error: detailError } = useBookingDetail(selectedDetailId);

  useEffect(() => {
    if (detailError) {
      handleCloseDetailModal();
      const err = detailError as any;
      if (err.status === 403) {
        setErrorModalConfig({ isOpen: true, title: '권한 없음', message: '해당 예매 상세 정보를 볼 권한이 없습니다.' });
      } else if (err.status === 404) {
        setErrorModalConfig({ isOpen: true, title: '예매 없음', message: '존재하지 않는 예매 내역입니다.' });
      } else {
        setErrorModalConfig({ isOpen: true, title: '조회 오류', message: err.message || '상세 정보를 불러오는 중 오류가 발생했습니다.' });
      }
    }
  }, [detailError]);

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

  const handleOpenDetailModal = (bookingId: string) => {
    setSelectedDetailId(bookingId);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedDetailId(null);
  };

  const handleOpenCancelModal = () => {
    if (selectedDetailId) {
      setSelectedBookingForCancel({ id: selectedDetailId });
      setIsDetailModalOpen(false);
      setIsCancelModalOpen(true);
    }
  };

  const handleCloseCancelModal = () => {
    setIsCancelModalOpen(false);
    setSelectedBookingForCancel(null);
  };

  const [errorModalConfig, setErrorModalConfig] = useState({ isOpen: false, title: '', message: '' });

  const handleConfirmCancel = () => {
    if (selectedBookingForCancel) {
      cancelBooking({ bookingId: selectedBookingForCancel.id }, {
        onSuccess: () => {
          handleCloseCancelModal();
        },
        onError: (err: any) => {
          handleCloseCancelModal();
          if (err.status === 400) {
            setErrorModalConfig({ isOpen: true, title: '취소 불가', message: '현재 취소할 수 없는 예매 상태입니다.' });
          } else if (err.status === 403) {
            setErrorModalConfig({ isOpen: true, title: '권한 없음', message: '해당 예매 내역을 취소할 권한이 없습니다.' });
          } else if (err.status === 404) {
            setErrorModalConfig({ isOpen: true, title: '예매 없음', message: '취소하려는 예매 내역을 찾을 수 없습니다.' });
          } else if (err.status === 409) {
            setErrorModalConfig({ isOpen: true, title: '이미 취소됨', message: '이미 취소 처리된 예매 내역입니다.' });
          } else {
            setErrorModalConfig({ isOpen: true, title: '취소 오류', message: err.message || '예매 취소 중 알 수 없는 오류가 발생했습니다.' });
          }
        }
      });
    }
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
                          { key: 'perfDate', header: '관람 일자', align: 'center' },
                          { key: 'perfTime', header: '관람 시간', align: 'center' },
                          { key: 'seatInfo', header: '좌석', align: 'center' }
                        ]} 
                        data={[{
                          perfDate: formatDateOnly(item.performanceDate),
                          perfTime: formatTimeOnly(item.performanceDate),
                          seatInfo: item.seatInfo.split(' ')[0]
                        }]} 
                        tableLayout="fixed"
                        className="[&_thead]:!bg-[#f1f5f9] [&_thead]:!border-b [&_thead]:!border-[#e2e8f0] [&_tbody]:!divide-none hover:[&_tr]:!bg-transparent [&_th]:!py-2 [&_th]:!px-1 [&_td]:!py-2.5 [&_td]:!px-1 [&_th_span]:!text-[11px] [&_th_span]:!font-bold [&_th_span]:!text-[#64748b] [&_td_span]:!text-[12px] [&_td_span]:!font-extrabold [&_td_span]:!text-[#334155]"
                      />
                    </div>

                    {/* 하단 액션 버튼들 */}
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => handleOpenDetailModal(item.id)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold transition-colors text-sm shadow-sm"
                      >
                        상세 정보 및 취소
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

      <Modal
        isOpen={isCancelModalOpen}
        onClose={handleCloseCancelModal}
        onCancel={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
        title="예매 전체 취소"
        description="이 예매 내역을 취소하시겠습니까? 취소된 예매는 복구할 수 없습니다."
        confirmText={isCanceling ? "취소 중..." : "예매 취소하기"}
        cancelText="닫기"
        isLoading={isCanceling}
      >
        <div className="mt-4 flex flex-col gap-2 w-full text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
          부분 취소는 지원하지 않으며, 포함된 모든 티켓이 일괄 취소됩니다.
        </div>
      </Modal>

      {/* 상세 모달 */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        title="예매 상세 내역"
        confirmText="예매 취소하기"
        cancelText="닫기"
        onConfirm={handleOpenCancelModal}
        onCancel={handleCloseDetailModal}
        isConfirmDisabled={bookingDetail?.bookingStatus === 'CANCELLED'}
      >
        <div className="flex flex-col gap-4 mt-2 w-full max-h-[60vh] overflow-y-auto">
          {isDetailLoading || !bookingDetail ? (
            <div className="py-10 flex justify-center text-gray-500">불러오는 중...</div>
          ) : (
            <>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <Text typography="t5" fontWeight="bold" className="mb-2">{bookingDetail.eventTitle}</Text>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="font-semibold w-20 inline-block text-gray-500">예매 번호</span> {bookingDetail.bookingNo}</p>
                  <p><span className="font-semibold w-20 inline-block text-gray-500">예매 일시</span> {new Date(bookingDetail.createdAt).toLocaleString()}</p>
                  <p><span className="font-semibold w-20 inline-block text-gray-500">상태</span> {bookingDetail.bookingStatus}</p>
                  <p><span className="font-semibold w-20 inline-block text-gray-500">총 결제액</span> {bookingDetail.totalPaymentAmount.toLocaleString()}원</p>
                </div>
              </div>

              <div>
                <Text typography="t6" fontWeight="bold" className="mb-2 text-gray-800">티켓 목록 ({bookingDetail.tickets?.length || 0}매)</Text>
                <div className="flex flex-col gap-2">
                  {bookingDetail.tickets?.map((ticket) => (
                    <div key={ticket.ticketNo} className="border border-gray-200 p-3 rounded-lg flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{ticket.seatLabel}</span>
                        <span className="text-xs text-gray-500">{ticket.sectionName} {ticket.rowLabel}열 {ticket.seatNumber}번</span>
                      </div>
                      <div className="text-right flex flex-col">
                        <span className="text-sm font-semibold text-blue-600">{ticket.finalPriceAmount.toLocaleString()}원</span>
                        <span className="text-[10px] text-gray-400">{ticket.ticketStatus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
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

      {/* 에러 모달 */}
      <Modal
        isOpen={errorModalConfig.isOpen}
        onClose={() => setErrorModalConfig({ ...errorModalConfig, isOpen: false })}
        title={errorModalConfig.title}
        description={errorModalConfig.message}
        confirmText="확인"
        showCancelButton={false}
        onConfirm={() => setErrorModalConfig({ ...errorModalConfig, isOpen: false })}
      />
    </div>
  );
};
