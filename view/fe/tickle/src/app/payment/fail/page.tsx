'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/src/shared/components/Header';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { paymentApi } from '@/src/shared/api/paymentApi';
import { Modal } from '@/src/shared/components/Modal';
import { useMypageStore } from '@/src/shared/store/useMypageStore';

function PaymentFailContent() {
  const router = useRouter();
  const { closeMypage } = useMypageStore();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const eventId = searchParams.get('eventId');
  const reasonParam = searchParams.get('reason') || '결제 중 오류가 발생했습니다.';

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
                  ? 'bg-red-300 text-white cursor-not-allowed'
                  : 'bg-red-600 text-white shadow-lg shadow-red-600/30 hover:bg-red-700'
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

export default function PaymentFailPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f8f8f8]"><div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <PaymentFailContent />
    </React.Suspense>
  );
}
