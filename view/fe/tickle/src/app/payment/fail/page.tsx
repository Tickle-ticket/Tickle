'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/src/shared/components/Header';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';

export default function PaymentFailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || '결제 중 오류가 발생했습니다.';

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex flex-col font-sans">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 w-full">
        <Header />
      </div>
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full text-center space-y-6">
          <ExclamationTriangleIcon className="w-20 h-20 text-red-500 mx-auto" />
          <h1 className="text-2xl font-extrabold text-gray-900">결제가 실패했습니다</h1>
          <p className="text-gray-500">{reason}</p>
          
          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={() => router.back()}
              className="w-full py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
              다시 결제하기
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-4 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 hover:bg-red-700 transition-colors"
            >
              홈으로 이동
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
