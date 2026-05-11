'use client';

import React, { useState } from 'react';
import { BookingDetailCard } from '@/src/shared/components/BookingDetailCard';
import { useBookingDetail, useCancelBooking } from '@/src/features/mypage/api/useMyPageData';
import { Modal } from '@/src/shared/components/Modal';
import { useRouter } from 'next/navigation';

export interface BookingDetailViewProps {
  bookingId: string;
  onBack?: () => void;
}

export const BookingDetailView = ({ bookingId, onBack }: BookingDetailViewProps) => {
  const router = useRouter();
  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };
  const { data: bookingDetail, isLoading, error } = useBookingDetail(bookingId);
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

  if (isLoading || !bookingDetail) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="text-gray-400 font-bold">불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <span className="text-gray-600 font-bold">상세 정보를 불러오지 못했습니다.</span>
        <button onClick={() => handleBack()} className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-xl font-bold text-gray-800 transition-colors">
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-[180px] md:pb-[220px]">
      {/* 상단 네비게이션 헤더 */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-200 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <button onClick={() => handleBack()} className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <span className="font-extrabold text-gray-900 text-[17px] tracking-tight">예매 상세 내역</span>
        <div className="w-9"></div> {/* 중앙 정렬용 투명 여백 */}
      </div>

      <div className="p-4 sm:p-6 w-full max-w-2xl mx-auto">
        <BookingDetailCard bookingDetail={bookingDetail} />
      </div>

      {/* 하단 고정 액션 버튼 */}
      <div className="fixed bottom-[70px] md:bottom-[100px] left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-200 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] z-20 pb-safe">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={handleOpenCancelModal}
            disabled={bookingDetail.bookingStatus === 'CANCELLED'}
            className="flex-1 py-4 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 disabled:bg-gray-100 disabled:text-gray-400 font-extrabold rounded-[14px] transition-colors text-[15px]"
          >
            {bookingDetail.bookingStatus === 'CANCELLED' ? '취소된 예매' : '예매 취소하기'}
          </button>
          
          {bookingDetail.bookingStatus === 'PENDING_PAYMENT' && (
            <button
              onClick={() => { /* 결제 로직 연결 */ }}
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold rounded-[14px] shadow-lg shadow-blue-500/30 transition-all text-[15px]"
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
