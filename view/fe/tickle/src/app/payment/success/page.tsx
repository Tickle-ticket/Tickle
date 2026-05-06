'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { paymentApi } from '@/src/shared/api/paymentApi';
import type { PaymentStatusResponse } from '@/src/shared/api/types/payment.types';
import { Header } from '@/src/shared/components/Header';
import { Modal } from '@/src/shared/components/Modal';
import { useMypageStore } from '@/src/shared/store/useMypageStore';
import { CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openMypage } = useMypageStore();
  
  const paymentId = searchParams.get('paymentId');
  const method = searchParams.get('method');
  const pgToken = searchParams.get('pg_token');

  const [paymentData, setPaymentData] = useState<PaymentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorModalConfig, setErrorModalConfig] = useState<{isOpen: boolean; title: string; message: string; action?: () => void}>({
    isOpen: false,
    title: '',
    message: ''
  });

  useEffect(() => {
    if (!paymentId) {
      setErrorModalConfig({
        isOpen: true,
        title: '결제 정보 없음',
        message: '결제 식별자가 올바르지 않습니다.',
        action: () => router.push('/')
      });
      setLoading(false);
      return;
    }

    const processPayment = async () => {
      try {
        // 카카오페이 승인 콜백으로 진입한 경우 승인 API 먼저 호출
        if (pgToken) {
          try {
            await paymentApi.approveKakaoPay(paymentId, pgToken);
          } catch (approveErr: any) {
            console.error('Failed to approve KakaoPay', approveErr);
            setErrorModalConfig({
              isOpen: true,
              title: '결제 승인 오류',
              message: approveErr.status === 404 ? '결제 정보를 찾을 수 없습니다.' : 
                       approveErr.status === 409 ? '현재 결제 상태에서는 승인 처리를 할 수 없습니다.' : 
                       '결제 승인 처리 중 오류가 발생했습니다.',
              action: () => router.push('/')
            });
            setLoading(false);
            return;
          }
        }

        const res = await paymentApi.getPaymentStatus(paymentId);
        if (res.data) {
          setPaymentData(res.data);
        } else {
          setErrorModalConfig({
            isOpen: true,
            title: '결제 상태 오류',
            message: '결제 상태를 불러오지 못했습니다.',
            action: () => router.push('/')
          });
        }
      } catch (err: any) {
        console.error('Failed to fetch payment status', err);
        setErrorModalConfig({
          isOpen: true,
          title: '결제 정보 조회 실패',
          message: err.status === 404 ? '결제 정보를 찾을 수 없습니다.' : '결제 정보를 불러오는 중 오류가 발생했습니다.',
          action: () => router.push('/')
        });
      } finally {
        setLoading(false);
      }
    };

    processPayment();
  }, [paymentId, pgToken, router]);

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex flex-col font-sans">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 w-full">
        <Header />
      </div>
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full space-y-6">
          
          <div className="flex flex-col items-center text-center space-y-4">
            {loading ? (
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : paymentData ? (
              <>
                {paymentData.paymentMethodType === 'BANK_TRANSFER' ? (
                  <InformationCircleIcon className="w-20 h-20 text-blue-500" />
                ) : (
                  <CheckCircleIcon className="w-20 h-20 text-green-500" />
                )}
                <h1 className="text-2xl font-extrabold text-gray-900">
                  {paymentData.paymentMethodType === 'BANK_TRANSFER' ? '무통장 입금 안내' : '예매가 완료되었습니다!'}
                </h1>
                <p className="text-gray-500">
                  예매 번호: <span className="font-bold text-gray-900">{paymentData.bookingNo}</span>
                </p>

                <div className="w-full bg-gray-50 p-6 rounded-2xl text-left space-y-3 mt-4 border border-gray-100">
                  <div className="flex justify-between">
                    <span className="text-gray-500">결제 금액</span>
                    <span className="font-bold text-lg">{paymentData.orderAmount.toLocaleString()} 원</span>
                  </div>
                  
                  {paymentData.paymentMethodType === 'BANK_TRANSFER' && (
                    <>
                      <div className="border-t border-gray-200 my-2" />
                      <div className="flex justify-between">
                        <span className="text-gray-500">입금 계좌</span>
                        <span className="font-bold text-blue-600">{paymentData.bankAccount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">예금주</span>
                        <span className="font-medium text-gray-900">{paymentData.accountHolder}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">입금 기한</span>
                        <span className="font-bold text-red-500">{paymentData.depositDeadline ? new Date(paymentData.depositDeadline).toLocaleString() : '기한 없음'}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        * 안내된 기한 내에 입금하지 않으시면 예매가 자동 취소됩니다.
                      </p>
                    </>
                  )}
                </div>
              </>
            ) : null}
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={() => {
                router.push('/');
                setTimeout(() => {
                  openMypage(paymentData?.paymentMethodType === 'BANK_TRANSFER' ? 'PAYMENTS' : 'MY_TICKETS');
                }, 100);
              }}
              className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
              {paymentData?.paymentMethodType === 'BANK_TRANSFER' ? '결제 관리' : '내 예매'}
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-colors"
            >
              홈으로
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
