'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { paymentApi } from '@/src/shared/api/paymentApi';
import type { PaymentStatusResponse } from '@/src/shared/api/types/payment.types';
import { useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  
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
    if (typeof window === 'undefined') return;
    
    // 카카오페이 등 팝업창에서 이 페이지로 리다이렉트 된 경우:
    // 팝업은 바로 닫아주고, 조회를 비롯한 최종 처리는 부모 창에서 진행하도록 합니다.
    // (보안 정책으로 window.opener가 null이 될 수 있으므로 window.name도 확인)
    if (window.name === 'kakaopay' || window.opener) {
      window.close();
      return;
    }
    
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
          
          // 예매가 완료/대기 상태로 변경되었으므로 캐시 무효화
          queryClient.invalidateQueries({ queryKey: ['myBookings'] });
          queryClient.invalidateQueries({ queryKey: ['pastBookings'] });
          
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
        <div className="bg-surface p-8 rounded-3xl shadow-xl max-w-lg w-full space-y-6">
          
          <div className="flex flex-col items-center text-center space-y-4">
            {loading ? (
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            ) : bookingDetail ? (
              <div className="w-full text-left">
                <h1 className="text-2xl font-extrabold text-content text-center mb-6">
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
              className="flex-1 py-4 bg-surface-muted text-content-secondary font-bold rounded-xl hover:bg-surface-active transition-colors"
            >
              내 예매
            </button>
            <button
              onClick={() => {
                closeMypage();
                window.location.href = '/';
              }}
              className="flex-1 py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:bg-primary-hover transition-colors"
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
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f8f8f8]"><div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <PaymentSuccessContent />
    </React.Suspense>
  );
}
