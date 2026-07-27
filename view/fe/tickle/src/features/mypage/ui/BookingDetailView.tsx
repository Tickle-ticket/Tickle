'use client';

import React, { useState } from 'react';
import { BookingDetailCard } from '@/src/shared/components/BookingDetailCard';
import { useBookingDetail, useCancelBooking } from '@/src/features/mypage/api/useMyPageData';
import { Modal } from '@/src/shared/components/Modal';
import { useRouter } from 'next/navigation';

import { BookingData } from '@/src/features/mypage/api/useMyPageData';
import { Box } from '@/src/shared/components/Box';
import { Table } from '@/src/shared/components/Table';
import { Text } from '@/src/shared/components/Text';
import { Badge } from '@/src/shared/components/Badge';
import { ForbiddenView, isForbiddenError } from '@/src/shared/components/ForbiddenView';

export interface BookingDetailViewProps {
  bookingId: string;
  onBack?: () => void;
  bookingData?: BookingData;
}

export const BookingDetailView = ({ bookingId, onBack, bookingData }: BookingDetailViewProps) => {
  const router = useRouter();
  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };
  const isCancelled = bookingData?.status === 'CANCELLED';
  const { data: bookingDetail, isLoading, error } = useBookingDetail(isCancelled ? null : bookingId);
  const { mutate: cancelBooking, isPending: isCanceling } = useCancelBooking();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [errorModalConfig, setErrorModalConfig] = useState({ isOpen: false, title: '', message: '' });

  const handleOpenCancelModal = () => {
    setIsCancelModalOpen(true);
  };

  const handleCloseCancelModal = () => {
    setIsCancelModalOpen(false);
  };

  const handleConfirmCancel = () => {
    cancelBooking({ bookingId }, {
      onSuccess: () => {
        handleCloseCancelModal();
        handleBack();
      },
      onError: (err: any) => {
        handleCloseCancelModal();
        setErrorModalConfig({ isOpen: true, title: '취소 오류', message: err.message || '오류가 발생했습니다.' });
      }
    });
  };

  if (isCancelled && bookingData) {
    return (
      <div className="w-full min-h-screen bg-surface-subtle pb-[180px] md:pb-[220px]">
        {/* 상단 네비게이션 헤더 */}
        <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-line px-4 py-3.5 flex items-center justify-between shadow-sm">
          <button onClick={() => handleBack()} className="p-1.5 -ml-1.5 rounded-full hover:bg-surface-muted active:bg-surface-active transition-colors">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-content">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <span className="font-extrabold text-content text-[17px] tracking-tight">예매 상세 내역</span>
          <div className="w-9"></div>
        </div>

        <div className="p-4 sm:p-6 w-full max-w-2xl mx-auto">
          <div className="flex flex-col gap-4 w-full">
            <Box variant="outline" className="p-0 sm:p-0 mb-2 overflow-hidden bg-surface">
              <div className="bg-surface-subtle/80 border-b border-line px-5 py-4 flex items-center justify-between">
                <Text typography="t5" fontWeight="bold" className="text-center text-content break-keep">{bookingData.title}</Text>
              </div>
              <div className="p-1">
                <Table
                  columns={[
                    { key: 'label', header: '', align: 'left', width: '70px', render: (row) => row.label },
                    { key: 'value', header: '', align: 'right', render: (row) => row.value }
                  ]}
                  data={[
                    { label: <Text typography="t6" color="secondary" fontWeight="medium" className="whitespace-nowrap">예매 번호</Text>, value: <Text typography="t6" color="primary" fontWeight="bold">{bookingData.bookingNo}</Text> },
                    { label: <Text typography="t6" color="secondary" fontWeight="medium" className="whitespace-nowrap">예매 일시</Text>, value: <Text typography="t6" color="primary" fontWeight="bold">{bookingData.bookingDate ? new Date(bookingData.bookingDate).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</Text> },
                    { label: <Text typography="t6" color="secondary" fontWeight="medium" className="whitespace-nowrap">공연장</Text>, value: <Text typography="t6" color="primary" fontWeight="bold">{bookingData.venue}</Text> },
                    { label: <Text typography="t6" color="secondary" fontWeight="medium" className="whitespace-nowrap">티켓 매수</Text>, value: <Text typography="t5" color="blue" fontWeight="extrabold">{bookingData.ticketCount}매</Text> }
                  ]}
                  className="[&_thead]:hidden [&_tbody_tr]:!bg-transparent hover:[&_tbody_tr]:!bg-surface-subtle/50 [&_td]:!py-3 [&_td]:!px-2 [&_td]:!border-b-0 [&_tr:not(:last-child)_td]:border-b [&_tr:not(:last-child)_td]:border-line-subtle"
                />
              </div>
            </Box>
            <div className="py-4 flex justify-center">
              <Badge color="red" variant="fill" size="large" maxLength={20} className="px-4 py-2 font-bold shadow-sm">
                이미 취소된 예매입니다
              </Badge>
            </div>
          </div>
        </div>

        <div className="fixed bottom-[70px] md:bottom-[100px] left-0 right-0 p-4 bg-surface/90 backdrop-blur-md border-t border-line shadow-[0_-8px_30px_rgba(0,0,0,0.08)] z-20 pb-safe">
          <div className="max-w-2xl mx-auto flex gap-3">
            <button
              disabled={true}
              className="flex-1 py-4 bg-surface-muted text-content-muted font-extrabold rounded-[14px] transition-colors text-[15px]"
            >
              취소된 예매
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 에러를 로딩보다 먼저 판정한다.
  // 실패 시 bookingDetail이 undefined라, 로딩 조건(!bookingDetail)이 앞서면
  // 에러 분기에 영원히 도달하지 못해 "불러오는 중"이 고착된다.
  if (error) {
    if (isForbiddenError(error)) {
      return <ForbiddenView error={error} onBack={handleBack} />;
    }

    return (
      <div className="w-full min-h-screen bg-surface-subtle flex flex-col items-center justify-center gap-4">
        <span className="text-content-secondary font-bold">상세 정보를 불러오지 못했습니다.</span>
        <button onClick={() => handleBack()} className="px-5 py-2.5 bg-surface-active hover:bg-surface-active rounded-xl font-bold text-content transition-colors">
          돌아가기
        </button>
      </div>
    );
  }

  if (isLoading || !bookingDetail) {
    return (
      <div className="w-full min-h-screen bg-surface-subtle flex items-center justify-center">
        <span className="text-content-muted font-bold">불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-surface-subtle pb-[180px] md:pb-[220px]">
      {/* 상단 네비게이션 헤더 */}
      <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-line px-4 py-3.5 flex items-center justify-between shadow-sm">
        <button onClick={() => handleBack()} className="p-1.5 -ml-1.5 rounded-full hover:bg-surface-muted active:bg-surface-active transition-colors">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-content">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <span className="font-extrabold text-content text-[17px] tracking-tight">예매 상세 내역</span>
        <div className="w-9"></div> {/* 중앙 정렬용 투명 여백 */}
      </div>

      <div className="p-4 sm:p-6 w-full max-w-2xl mx-auto">
        <BookingDetailCard bookingDetail={bookingDetail} />
      </div>

      {/* 하단 고정 액션 버튼 */}
      <div className="fixed bottom-[70px] md:bottom-[100px] left-0 right-0 p-4 bg-surface/90 backdrop-blur-md border-t border-line shadow-[0_-8px_30px_rgba(0,0,0,0.08)] z-20 pb-safe">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={handleOpenCancelModal}
            disabled={bookingDetail.bookingStatus === 'CANCELLED'}
            className="flex-1 py-4 bg-danger-subtle hover:bg-danger-light active:bg-danger-light text-danger disabled:bg-surface-muted disabled:text-content-muted font-extrabold rounded-[14px] transition-colors text-[15px]"
          >
            {bookingDetail.bookingStatus === 'CANCELLED' ? '취소된 예매' : '예매 취소하기'}
          </button>
          
          {bookingDetail.bookingStatus === 'PENDING_PAYMENT' && (
            <button
              onClick={() => { /* 결제 로직 연결 */ }}
              className="flex-1 py-4 bg-primary hover:bg-primary-hover active:bg-primary-hover text-white font-extrabold rounded-[14px] shadow-lg shadow-blue-500/30 transition-all text-[15px]"
            >
              결제 진행하기
            </button>
          )}
        </div>
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

      <Modal
        isOpen={errorModalConfig.isOpen}
        onClose={() => setErrorModalConfig({ ...errorModalConfig, isOpen: false })}
        title={errorModalConfig.title}
        description={errorModalConfig.message}
        confirmText="확인"
        onConfirm={() => setErrorModalConfig({ ...errorModalConfig, isOpen: false })}
      />
    </div>
  );
};
