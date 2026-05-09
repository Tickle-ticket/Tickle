'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/src/shared/components/Header';
import { XCircleIcon } from '@heroicons/react/24/solid';
import { paymentApi } from '@/src/shared/api/paymentApi';
import { Modal } from '@/src/shared/components/Modal';
import { useMypageStore } from '@/src/shared/store/useMypageStore';

function PaymentCancelContent() {
  const router = useRouter();
  const { closeMypage } = useMypageStore();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const eventId = searchParams.get('eventId');

  const [isProcessing, setIsProcessing] = useState(true);
  const [errorModalConfig, setErrorModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: () => { },
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.opener) {
      window.opener.postMessage(
        { type: 'PAYMENT_COMPLETE', url: window.location.pathname + window.location.search },
        window.location.origin
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.opener) return; // 팝업인 경우 아래 로직 실행 안함
    
    setIsProcessing(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full text-center space-y-6">
          <XCircleIcon className="w-20 h-20 text-gray-400 mx-auto" />
          <h1 className="text-2xl font-extrabold text-gray-900">결제를 취소하셨습니다</h1>
          <p className="text-gray-500">
            {isProcessing ? '취소 처리 중입니다...' : '결제 과정에서 취소되었습니다. 다시 예매를 진행해주세요.'}
          </p>

          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={() => eventId ? router.push(`/detail?id=${eventId}`) : router.push('/')}
              disabled={isProcessing}
              className={`w-full py-4 font-bold rounded-xl transition-colors ${isProcessing
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              다시 예매하기
            </button>
            <button
              onClick={() => {
                closeMypage();
                router.push('/');
              }}
              disabled={isProcessing}
              className={`w-full py-4 font-bold rounded-xl transition-colors ${isProcessing
                  ? 'bg-gray-300 text-white cursor-not-allowed'
                  : 'bg-gray-600 text-white shadow-lg shadow-gray-600/30 hover:bg-gray-700'
                }`}
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={errorModalConfig.isOpen}
        onClose={() => {
          setErrorModalConfig(prev => ({ ...prev, isOpen: false }));
          if (errorModalConfig.action) errorModalConfig.action();
        }}
        title={errorModalConfig.title}
        description={errorModalConfig.message}
        confirmText="확인"
        showCancelButton={false}
        onConfirm={() => {
          setErrorModalConfig(prev => ({ ...prev, isOpen: false }));
          if (errorModalConfig.action) errorModalConfig.action();
        }}
      />
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f8f8f8]"><div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <PaymentCancelContent />
    </React.Suspense>
  );
}
