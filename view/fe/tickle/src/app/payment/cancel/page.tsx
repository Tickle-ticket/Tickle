'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/src/shared/components/Header';
import { XCircleIcon } from '@heroicons/react/24/solid';

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full text-center space-y-6">
          <XCircleIcon className="w-20 h-20 text-gray-400 mx-auto" />
          <h1 className="text-2xl font-extrabold text-gray-900">결제를 취소하셨습니다</h1>
          <p className="text-gray-500">결제 과정에서 취소되었습니다. 다시 예매를 진행해주세요.</p>
          
          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={() => router.back()}
              className="w-full py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
              이전 페이지로 돌아가기
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-4 bg-gray-600 text-white font-bold rounded-xl shadow-lg shadow-gray-600/30 hover:bg-gray-700 transition-colors"
            >
              홈으로 이동
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
