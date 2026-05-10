'use client';

import React, { useEffect, useState } from 'react';
import { useCancellationDetail } from '../api/useCancellationDetail';
import { purchaseCancellation } from '@/src/shared/api/cancellationApi';

interface CancellationDetailViewProps {
  cancellationId: string;
  onClose: () => void;
}

export const CancellationDetailView: React.FC<CancellationDetailViewProps> = ({ cancellationId, onClose }) => {
  const { data, isLoading, error } = useCancellationDetail(cancellationId);
  const [paymentMethod, setPaymentMethod] = useState<'KAKAOPAY' | 'BANK_TRANSFER'>('KAKAOPAY');
  const [isPurchasing, setIsPurchasing] = useState(false);

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
      if (!isPurchasing && !isNormalNavigation()) {
        // 백엔드에 명시적으로 오퍼를 거절(해제)하는 API가 있다면 여기서 호출합니다.
        // 현재 cancellationApi 에는 명시적인 거절 API가 없으므로 임의로 DELETE 요청을 보냅니다.
        // (필요 시 백엔드 명세에 맞춰 수정하세요)
        fetch(`/api/v1/cancellations/${cancellationId}`, { method: 'DELETE' }).catch(console.error);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isPurchasing && !isNormalNavigation()) {
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
  }, [isPurchasing, cancellationId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {isLoading ? (
        <div className="text-white bg-gray-900 px-6 py-4 rounded-xl border border-gray-700 shadow-2xl">
          <p className="animate-pulse font-medium">취소표 정보를 불러오는 중...</p>
        </div>
      ) : data ? (
        <div className="w-full max-w-md border border-gray-800 rounded-2xl p-6 sm:p-8 bg-gray-900 shadow-2xl relative animate-fade-in-up">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full p-2 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <h1 className="text-2xl font-bold mb-2 text-indigo-400">취소표 제안 상세</h1>
          <p className="text-sm text-gray-400 mb-6">
            배정된 취소표 정보입니다. 만료 시간 전에 결제를 완료해야 합니다.
          </p>

          <div className="space-y-4 mb-8 text-sm sm:text-base">
            <div className="flex justify-between border-b border-gray-800 pb-3">
              <span className="text-gray-500">제안 ID</span>
              <span className="text-white font-medium">{data.offerId}</span>
            </div>
            <div className="flex justify-between border-b border-gray-800 pb-3">
              <span className="text-gray-500">회차 ID</span>
              <span className="text-white font-medium">{data.sessionId}</span>
            </div>
            <div className="flex justify-between border-b border-gray-800 pb-3">
              <span className="text-gray-500">좌석 정보</span>
              <span className="text-white font-bold">{data.section}구역 {data.row}열 {data.number}번</span>
            </div>
            <div className="flex justify-between border-b border-gray-800 pb-3">
              <span className="text-gray-500">결제 금액</span>
              <span className="text-emerald-400 font-bold">{data.totalPaymentAmount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between border-b border-gray-800 pb-3">
              <span className="text-gray-500">만료 일시</span>
              <span className="text-rose-400 font-medium">
                {new Date(data.offerExpiresAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm text-gray-400 mb-3 font-medium">결제 수단 선택</h3>
            <div className="flex gap-3">
              <button
                className={`flex-1 py-3 rounded-xl border font-bold transition-all ${
                  paymentMethod === 'KAKAOPAY'
                    ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => setPaymentMethod('KAKAOPAY')}
              >
                카카오페이
              </button>
              <button
                className={`flex-1 py-3 rounded-xl border font-bold transition-all ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.3)]'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => setPaymentMethod('BANK_TRANSFER')}
              >
                무통장입금
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3.5 rounded-xl font-bold text-sm sm:text-base transition-colors border border-gray-700 disabled:opacity-50"
              onClick={onClose}
              disabled={isPurchasing}
            >
              닫기
            </button>
            <button
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-bold text-sm sm:text-base transition-colors shadow-lg shadow-indigo-500/20 flex justify-center items-center disabled:opacity-50"
              disabled={isPurchasing}
              onClick={async () => {
                try {
                  setIsPurchasing(true);
                  const res = await purchaseCancellation(cancellationId, { paymentMethod });
                  const result = res.data;
                  
                  if (result.paymentMethod === 'KAKAOPAY' && result.redirectUrl) {
                    window.location.href = result.redirectUrl;
                  } else if (result.paymentMethod === 'BANK_TRANSFER') {
                    alert(`무통장 입금 예약이 완료되었습니다.\n\n계좌: ${result.bankAccount}\n예금주: ${result.accountHolder}\n입금 기한: ${new Date(result.depositDeadline || '').toLocaleString()}`);
                    onClose();
                  }
                } catch (err: any) {
                  alert(err.message || '결제 진행 중 오류가 발생했습니다.');
                } finally {
                  setIsPurchasing(false);
                }
              }}
            >
              {isPurchasing ? '처리중...' : '결제 진행하기'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
