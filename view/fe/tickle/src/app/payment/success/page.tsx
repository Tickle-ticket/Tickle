'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { paymentApi } from '@/src/shared/api/paymentApi';
import type { PaymentStatusResponse } from '@/src/shared/api/types/payment.types';
import { Header } from '@/src/shared/components/Header';
import { Modal } from '@/src/shared/components/Modal';
import { useMypageStore } from '@/src/shared/store/useMypageStore';
import { CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import type { ReservationDetail } from '@/src/shared/api/types/reservation.types';
import { BookingDetailCard } from '@/src/shared/components/BookingDetailCard';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openMypage, closeMypage } = useMypageStore();
  
  const paymentIdParam = searchParams.get('paymentId');
  const bookingIdParam = searchParams.get('bookingId');
  const method = searchParams.get('method');
  const pgToken = searchParams.get('pg_token');

  const [paymentData, setPaymentData] = useState<PaymentStatusResponse | null>(null);
  const [bookingDetail, setBookingDetail] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorModalConfig, setErrorModalConfig] = useState<{isOpen: boolean; title: string; message: string; action?: () => void}>({
    isOpen: false,
    title: '',
    message: ''
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
    
    if (!paymentIdParam && !bookingIdParam) {
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
        let actualPaymentId = paymentIdParam ? Number(paymentIdParam) : null;
        
        if (!actualPaymentId && bookingIdParam) {
          const { reservationApi } = await import('@/src/shared/api/reservationApi');
          const resDetail = await reservationApi.getReservationDetail(bookingIdParam);
          if (resDetail.data?.paymentId) {
            actualPaymentId = resDetail.data.paymentId;
          }
        }

        if (!actualPaymentId) {
          throw new Error('결제 내역을 찾을 수 없습니다.');
        }

        const res = await paymentApi.getPaymentStatus(actualPaymentId);
        if (res.data) {
          setPaymentData(res.data);
          
          const { reservationApi } = await import('@/src/shared/api/reservationApi');
          try {
            const detailRes = await reservationApi.getReservationDetail(res.data.bookingId);
            if (detailRes.data) {
              setBookingDetail(detailRes.data);
            }
          } catch (e) {
            console.error('Failed to load reservation detail', e);
          }
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
  }, [paymentIdParam, bookingIdParam, pgToken, router]);

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
            ) : bookingDetail ? (
              <div className="w-full text-left">
                <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-6">
                  예매가 완료되었습니다!
                </h1>
                <BookingDetailCard bookingDetail={bookingDetail} paymentDetail={paymentData || undefined} />
              </div>
            ) : null}
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={() => {
                router.push('/?view=mypage&tab=MY_TICKETS');
              }}
              className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
              내 예매
            </button>
            <button
              onClick={() => {
                closeMypage();
                router.push('/');
              }}
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

export default function PaymentSuccessPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f8f8f8]"><div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <PaymentSuccessContent />
    </React.Suspense>
  );
}
