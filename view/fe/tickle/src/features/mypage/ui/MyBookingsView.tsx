'use client';

import React, { useState, useEffect } from 'react';
import { useMyBookings, useCancelBooking, useBookingDetail, usePaymentStatus } from '@/src/features/mypage/api/useMyPageData';
import { Text } from '@/src/shared/components/Text';
import { Table } from '@/src/shared/components/Table';
import { Modal } from '@/src/shared/components/Modal';
import { SegmentedControl } from '@/src/shared/components/SegmentedControl';
import { BookingCard } from '@/src/shared/components/BookingCard';
import { MobileBookingCard } from '@/src/shared/components/MobileBookingCard';
import { BookingDetailCard } from '@/src/shared/components/BookingDetailCard';
import { Box } from '@/src/shared/components/Box';
import { Badge } from '@/src/shared/components/Badge';
import { useRouter } from 'next/navigation';
import { BookingDetailView } from './BookingDetailView';

export const MyBookingsView = () => {
  const router = useRouter();
  const { data: bookings, isLoading } = useMyBookings();
  const { mutate: cancelBooking, isPending: isCanceling } = useCancelBooking();

  const [filterStatus, setFilterStatus] = useState('ALL');

  const filterOptions = [
    { label: '전체', value: 'ALL' },
    { label: '예매 완료', value: 'CONFIRMED' },
    { label: '결제 대기', value: 'PENDING_PAYMENT' }
  ];

  const filteredBookings = bookings?.filter((item) => {
    if (item.status === 'CANCELLED') return false;
    if (filterStatus === 'ALL') return true;
    return item.status === filterStatus;
  }) || [];

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<{ id: string } | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);

  const { data: bookingDetail, isLoading: isDetailLoading, error: detailError } = useBookingDetail(selectedDetailId);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const effectivePaymentId = selectedPaymentId || (bookingDetail?.paymentId as number) || null;
  const { data: paymentDetail, isLoading: isPaymentLoading } = usePaymentStatus(effectivePaymentId);

  const handleOpenPaymentModal = (paymentId: number | null, bookingId: string) => {
    setSelectedPaymentId(paymentId);
    setSelectedDetailId(bookingId); // 취소 기능 및 paymentId 조회를 위해 저장
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedPaymentId(null);
  };

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

  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const handleOpenDetailModal = (bookingId: string) => {
    setSelectedDetailId(bookingId);
    if (window.innerWidth < 768) {
      // 모바일 환경: 풀스크린 오버레이 뷰어 열기
      setIsMobileDetailOpen(true);
    } else {
      // 데스크톱 환경: 기존대로 모달 열기
      setIsDetailModalOpen(true);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setIsMobileDetailOpen(false);
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Text typography="t5" color="secondary">
          총 <span className="font-bold text-blue-600">{filteredBookings.length}</span>건의 예매 내역이 있습니다.
        </Text>
        <SegmentedControl
          options={filterOptions}
          value={filterStatus}
          onChange={setFilterStatus}
          size="small"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20 justify-items-center">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="w-full h-[400px] bg-gray-100 animate-pulse rounded-2xl" />
          ))
        ) : filteredBookings.length > 0 ? (
          filteredBookings.map((item) => (
            <React.Fragment key={item.id}>
              {/* Desktop/Tablet View */}
              <div className="hidden md:block w-full">
                <BookingCard
                  item={item}
                  onOpenPayment={handleOpenPaymentModal}
                  onOpenCancel={(id) => {
                    setSelectedBookingForCancel({ id });
                    setIsCancelModalOpen(true);
                  }}
                  onOpenDetail={handleOpenDetailModal}
                  onOpenBarcode={handleOpenBarcodeModal}
                />
              </div>
              {/* Mobile View */}
              <div className="block md:hidden w-full">
                <MobileBookingCard
                  item={item}
                  onOpenPayment={handleOpenPaymentModal}
                  onOpenCancel={(id) => {
                    setSelectedBookingForCancel({ id });
                    setIsCancelModalOpen(true);
                  }}
                  onOpenDetail={handleOpenDetailModal}
                  onOpenBarcode={handleOpenBarcodeModal}
                />
              </div>
            </React.Fragment>
          ))
        ) : (
          <div className="col-span-full w-full flex flex-col items-center justify-center py-16 md:py-24 px-6 bg-gray-50 rounded-2xl border border-gray-200 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-5">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
              <path d="M13 5v2"></path>
              <path d="M13 17v2"></path>
              <path d="M13 11v2"></path>
            </svg>
            <Text typography="t5" fontWeight="bold" color="secondary" textAlign="center" className="mb-2 break-keep">
              예매 내역이 없습니다.
            </Text>
            <Text typography="t6" color="tertiary" textAlign="center" className="break-keep max-w-[260px] md:max-w-none">
              새로운 공연을 예매해 보세요!
            </Text>
          </div>
        )}
      </div>

      <Modal
        isOpen={isCancelModalOpen}
        onClose={handleCloseCancelModal}
        onCancel={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
        title="예매 취소"
        description="이 예매 내역을 취소하시겠습니까? 취소된 예매는 복구할 수 없습니다."
        confirmText={isCanceling ? "취소 중..." : "예매 취소하기"}
        cancelText="닫기"
        isLoading={isCanceling}
      />

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
        className="!max-w-[400px] sm:!max-w-[450px]"
      >
        <div className="flex flex-col gap-4 mt-2 w-full max-h-[60vh] overflow-y-auto">
          {isDetailLoading || !bookingDetail ? (
            <div className="py-10 flex justify-center text-gray-500">불러오는 중...</div>
          ) : (
            <BookingDetailCard bookingDetail={bookingDetail} />
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
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={handleClosePaymentModal}
        showCancelButton={false}
        confirmText="닫기"
        onConfirm={handleClosePaymentModal}
        className="!max-w-[400px] sm:!max-w-[450px]"
      >
        <div className="p-1 sm:p-2 w-full">
          {isPaymentLoading || (selectedPaymentId === null && isDetailLoading) ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 font-medium animate-pulse">결제 정보를 불러오는 중...</p>
            </div>
          ) : paymentDetail ? (
            <div className="flex flex-col gap-4 w-full">
              <Box variant="outline" className="p-0 sm:p-0 mb-2 overflow-hidden bg-white w-full">
                <div className="bg-gray-50/80 border-b border-gray-200 px-5 py-4 flex items-center justify-center">
                  <Text typography="t5" fontWeight="bold" className="text-center text-gray-800 break-keep">무통장 입금 정보</Text>
                </div>
                <div className="p-1">
                  <Table
                columns={[
                  { key: 'label', header: '', align: 'left', width: '70px', render: (row) => row.label },
                  { key: 'value', header: '', align: 'right', render: (row) => row.value }
                ]}
                data={[
                  { label: <Text typography="t6" color="secondary" fontWeight="medium" className="whitespace-nowrap">결제 수단</Text>, value: <Text typography="t6" color="primary" fontWeight="bold">{paymentDetail.paymentMethodType === 'BANK_TRANSFER' ? '무통장 입금' : paymentDetail.paymentMethodType}</Text> },
                  { label: <Text typography="t6" color="secondary" fontWeight="medium" className="whitespace-nowrap">입금 은행</Text>, value: <Text typography="t6" color="primary" fontWeight="bold">{paymentDetail.bankAccount?.split(' ')[0] || '-'}</Text> },
                  { label: <Text typography="t6" color="secondary" fontWeight="medium" className="whitespace-nowrap">계좌번호</Text>, value: <Text typography="t6" color="primary" fontWeight="bold">{paymentDetail.bankAccount?.replace(/^.*? /, '') || paymentDetail.bankAccount || '-'}</Text> },
                  { label: <Text typography="t6" color="secondary" fontWeight="medium" className="whitespace-nowrap">예금주</Text>, value: <Text typography="t6" color="primary" fontWeight="bold">{paymentDetail.accountHolder || '-'}</Text> },
                  { label: <Text typography="t6" color="secondary" fontWeight="medium" className="whitespace-nowrap">결제 금액</Text>, value: <Text typography="t5" color="blue" fontWeight="extrabold">{paymentDetail.orderAmount?.toLocaleString()}원</Text> }
                ]}
                  className="[&_thead]:hidden [&_tbody_tr]:!bg-transparent hover:[&_tbody_tr]:!bg-gray-50/50 [&_td]:!py-3 [&_td]:!px-2 [&_td]:!border-b-0 [&_tr:not(:last-child)_td]:border-b [&_tr:not(:last-child)_td]:border-gray-100"
                />
                <div className="bg-red-50/80 p-4 flex flex-col items-center justify-center gap-1.5 border-t border-red-100 mt-2">
                  <Text typography="t7" color="red" fontWeight="medium">입금 기한</Text>
                  <Text typography="t6" color="red" fontWeight="extrabold">
                    {paymentDetail.depositDeadline ? new Date(paymentDetail.depositDeadline).toLocaleString('ko-KR', {
                      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '-'}
                  </Text>
                </div>
                </div>
              </Box>
              
              {paymentDetail.seats && paymentDetail.seats.length > 0 && (
                <div className="mt-6">
                  <Text typography="t6" fontWeight="bold" className="block mb-3 text-left text-gray-900">상세 좌석 ({paymentDetail.seats.length}매)</Text>
                  <div className="flex flex-row flex-wrap justify-start gap-2">
                    {paymentDetail.seats.map((seat) => (
                      <Badge key={seat.sessionSeatId} color="blue" variant="outline" size="medium" className="font-extrabold px-4 py-2 bg-white shadow-sm">
                        {seat.rowLabel ? `${seat.rowLabel}열 ` : ''}{seat.seatNumber ? `${seat.seatNumber}번` : seat.seatLabel}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto text-red-400 mb-3"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <p className="text-red-500 font-bold">결제 정보를 불러오지 못했습니다.</p>
              <p className="text-gray-500 text-sm mt-1">잠시 후 다시 시도해주세요.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* 모바일 전용 상세 오버레이 뷰 */}
      {isMobileDetailOpen && selectedDetailId && (
        <div className="fixed inset-0 z-[100] bg-gray-50 overflow-y-auto md:hidden">
          <BookingDetailView 
            bookingId={selectedDetailId} 
            onBack={() => setIsMobileDetailOpen(false)} 
          />
        </div>
      )}
    </div>
  );
};
