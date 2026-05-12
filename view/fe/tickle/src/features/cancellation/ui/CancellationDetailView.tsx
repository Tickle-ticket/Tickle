'use client';

import React, { useEffect, useState } from 'react';
import { useCancellationDetail } from '../api/useCancellationDetail';
import { PaymentStep } from '@/src/features/book/ui/components/PaymentStep';
import { useUserProfile } from '@/src/shared/api/useUserProfile';
import { Modal } from '@/src/shared/components/Modal';
import { useBookStore } from '@/src/features/book/store/useBookStore';

interface CancellationDetailViewProps {
  cancellationId: string;
  onClose: () => void;
}

export const CancellationDetailView: React.FC<CancellationDetailViewProps> = ({ cancellationId, onClose }) => {
  const { data, isLoading, error } = useCancellationDetail(cancellationId);
  const { data: userProfile } = useUserProfile();
  const setBookingStep = useBookStore((s: any) => s.setBookingStep);
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [errorModalConfig, setErrorModalConfig] = useState<{isOpen: boolean; title: string; message: string}>({
    isOpen: false, title: '', message: ''
  });

  useEffect(() => {
    if (error) {
      alert(`조회 실패: ${error.message}`);
      onClose();
    }
  }, [error, onClose]);

  return (
    <>
      {showPaymentFlow && data ? (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
          <PaymentStep
            eventId="cancel"
            userId={userProfile?.userId}
            userProfile={userProfile}
            onCancel={onClose}
            onConflictError={() => setErrorModalConfig({ isOpen: true, title: '결제 오류', message: '결제 오류가 발생했습니다.' })}
            onError={(title, msg) => setErrorModalConfig({ isOpen: true, title, message: msg })}
            cancellationId={Number(cancellationId)}
            cancellationTotalAmount={data.totalPaymentAmount}
          />
        </div>
      ) : (
        <Modal
          isOpen={!isLoading && !!data}
          onClose={onClose}
          title="취소표 결제 확인"
          confirmText="결제 진행"
          cancelText="취소"
          onConfirm={() => {
            setBookingStep('PAYMENT');
            setShowPaymentFlow(true);
          }}
          onCancel={onClose}
        >
          {data && (
            <div className="w-full mt-2">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2.5 pr-3 text-gray-400 font-medium whitespace-nowrap text-left">좌석</td>
                    <td className="py-2.5 text-gray-900 font-bold text-right">{data.section} {data.row}열 {data.number}번</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2.5 pr-3 text-gray-400 font-medium whitespace-nowrap text-left">결제 금액</td>
                    <td className="py-2.5 text-blue-600 font-extrabold text-right text-base">{data.totalPaymentAmount?.toLocaleString()}원</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 text-gray-400 font-medium whitespace-nowrap text-left">만료 일시</td>
                    <td className="py-2.5 text-rose-500 font-semibold text-right text-xs">{new Date(data.offerExpiresAt).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-center text-gray-500 text-xs mt-3">결제를 진행하시겠습니까?</p>
            </div>
          )}
        </Modal>
      )}

      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="text-white bg-gray-900 px-6 py-4 rounded-xl border border-gray-700 shadow-2xl">
            <p className="animate-pulse font-medium">취소표 정보를 불러오는 중...</p>
          </div>
        </div>
      )}

      <Modal
        isOpen={errorModalConfig.isOpen}
        onClose={() => setErrorModalConfig(prev => ({ ...prev, isOpen: false }))}
        title={errorModalConfig.title}
        confirmText="확인"
        onConfirm={() => setErrorModalConfig(prev => ({ ...prev, isOpen: false }))}
      >
        <div className="py-4 text-center text-gray-700 font-medium whitespace-pre-line leading-relaxed">
          {errorModalConfig.message}
        </div>
      </Modal>
    </>
  );
};
