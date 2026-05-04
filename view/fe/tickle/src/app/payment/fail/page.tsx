'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/src/shared/components/Header';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { paymentApi } from '@/src/shared/api/paymentApi';
import { Modal } from '@/src/shared/components/Modal';

export default function PaymentFailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('paymentId');
  const reasonParam = searchParams.get('reason') || '결제 중 오류가 발생했습니다.';

  const [isProcessing, setIsProcessing] = useState(true);
  const [errorModalConfig, setErrorModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: () => { },
  });

  useEffect(() => {
    const processFail = async () => {
      if (!paymentId) {
        setIsProcessing(false);
        return;
      }

      try {
        await paymentApi.failKakaoPay(paymentId);
        setIsProcessing(false);
      } catch (err: any) {
        setIsProcessing(false);

        let title = '실패 처리 오류';
        let message = '결제 실패 처리 중 오류가 발생했습니다.';

        if (err.status === 404) {
          message = '결제 정보를 찾을 수 없습니다.';
        } else if (err.status === 409) {
          message = '현재 결제 상태에서는 실패 처리를 할 수 없습니다.';
        }

        setErrorModalConfig({
          isOpen: true,
          title,
          message,
          action: () => router.push('/'),
        });
      }
    };

    processFail();
  }, [paymentId, router]);

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex flex-col font-sans">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 w-full">
        <Header />
      </div>
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full text-center space-y-6">
          <ExclamationTriangleIcon className="w-20 h-20 text-red-500 mx-auto" />
          <h1 className="text-2xl font-extrabold text-gray-900">결제가 실패했습니다</h1>
          <p className="text-gray-500">
            {isProcessing ? '실패 처리 중입니다...' : reasonParam}
          </p>

          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={() => router.push('/')}
              disabled={isProcessing}
              className={`w-full py-4 font-bold rounded-xl transition-colors ${isProcessing
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              다시 예매하기 (홈으로)
            </button>
            <button
              onClick={() => router.push('/')}
              disabled={isProcessing}
              className={`w-full py-4 font-bold rounded-xl transition-colors ${isProcessing
                  ? 'bg-red-300 text-white cursor-not-allowed'
                  : 'bg-red-600 text-white shadow-lg shadow-red-600/30 hover:bg-red-700'
                }`}
            >
              마이페이지에서 결제 재시도
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={errorModalConfig.isOpen}
        title={errorModalConfig.title}
        description={errorModalConfig.message}
        confirmText="확인"
        onConfirm={() => {
          setErrorModalConfig(prev => ({ ...prev, isOpen: false }));
          if (errorModalConfig.action) errorModalConfig.action();
        }}
      />
    </div>
  );
}
