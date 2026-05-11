'use client';

import React, { useEffect, useState } from 'react';
import { useCancellationDetail } from '../api/useCancellationDetail';
import { PaymentStep } from '@/src/features/book/ui/components/PaymentStep';
import { useUserProfile } from '@/src/shared/api/useUserProfile';

interface CancellationDetailViewProps {
  cancellationId: string;
  onClose: () => void;
}

export const CancellationDetailView: React.FC<CancellationDetailViewProps> = ({ cancellationId, onClose }) => {
  const { data, isLoading, error } = useCancellationDetail(cancellationId);
  const { data: userProfile } = useUserProfile();

  useEffect(() => {
    if (error) {
      alert(`조회 실패: ${error.message}`);
      onClose();
    }
  }, [error, onClose]);

  // 이탈 시 취소표 배정(오퍼) 자동 거절/해제 로직
  useEffect(() => {
    // 정상적인 결제 리다이렉트인지 확인
    const isNormalNavigation = () => (window as any).__isNavigatingToPayment__ === true;

    const releaseOffer = () => {
      if (!isNormalNavigation()) {
        fetch(`/api/v1/cancellations/${cancellationId}`, { method: 'DELETE' }).catch(console.error);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isNormalNavigation()) {
        releaseOffer();
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      releaseOffer();
    };
  }, [cancellationId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {isLoading ? (
        <div className="text-white bg-gray-900 px-6 py-4 rounded-xl border border-gray-700 shadow-2xl">
          <p className="animate-pulse font-medium">취소표 정보를 불러오는 중...</p>
        </div>
      ) : data ? (
        <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-800 rounded-2xl p-6 sm:p-8 bg-zinc-950 shadow-2xl relative animate-fade-in-up">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-50 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full p-2 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <h1 className="text-2xl font-bold mb-2 text-indigo-400">취소표 제안 상세</h1>
          <p className="text-sm text-gray-400 mb-6">
            배정된 취소표 정보입니다. 만료 시간 전에 결제를 완료해야 합니다.
            <br/>만료 일시: <span className="text-rose-400 font-medium">{new Date(data.offerExpiresAt).toLocaleString()}</span>
          </p>

          <div className="relative w-full overflow-hidden flex flex-col md:flex-row bg-zinc-950">
            {/* PaymentStep 컴포넌트를 직접 렌더링 */}
            <PaymentStep
              eventId="cancel" // dummy eventId
              userId={userProfile?.userId}
              userProfile={userProfile}
              onCancel={onClose}
              onConflictError={() => alert('결제 오류 발생')}
              onError={(title, msg) => alert(`${title}: ${msg}`)}
              cancellationId={Number(cancellationId)}
              cancellationTotalAmount={data.totalPaymentAmount}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};
