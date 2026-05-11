import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Toggle } from '@/src/shared/components/Toggle';
import { useBookStore } from '../../store/useBookStore';
import { BookingOptionsResponse } from '@/src/shared/api/types/booking.types';
import { paymentApi } from '@/src/shared/api/paymentApi';
import { purchaseCancellation } from '@/src/shared/api/cancellationApi';
import { bookingApi } from '@/src/shared/api/bookingApi';
import { reservationApi } from '@/src/shared/api/reservationApi';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentStepProps {
  optionsData?: BookingOptionsResponse;
  preorderBookingId?: number | null;
  eventId: string;
  scheduleId?: string | null;
  userId: number | undefined;
  userProfile: any;
  onCancel: () => void;
  onConflictError: () => void;
  onError: (title: string, message: string) => void;
  storyMode?: boolean;
  cancellationId?: number;
  cancellationTotalAmount?: number;
}

const priceGradeDotColors: Record<string, string> = {
  'VIP': 'grade-dot-vip',
  'R': 'grade-dot-r',
  'S': 'grade-dot-s',
  'A': 'grade-dot-a',
};

export const PaymentStep: React.FC<PaymentStepProps> = ({
  optionsData,
  preorderBookingId,
  eventId,
  scheduleId,
  userId,
  userProfile,
  onCancel,
  onConflictError,
  onError,
  storyMode = false,
  cancellationId,
  cancellationTotalAmount,
}) => {
  const bookingStep = useBookStore((s: any) => s.bookingStep);
  const setBookingStep = useBookStore((s: any) => s.setBookingStep);
  const priceGradeTicketCounts = useBookStore((s: any) => s.priceGradeTicketCounts);

  const router = useRouter();
  const [isKakaoPopupOpen, setIsKakaoPopupOpen] = useState(false);
  const [isStorybookMockOpen, setIsStorybookMockOpen] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [buyerName, setBuyerName] = useState(userProfile?.name || userProfile?.nickname || '');
  const [buyerEmail, setBuyerEmail] = useState(userProfile?.email || '');
  const [buyerPhone, setBuyerPhone] = useState(userProfile?.phoneNumber || '');

  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerm1, setAgreeTerm1] = useState(false);
  const [agreeTerm2, setAgreeTerm2] = useState(false);
  const [termExpand1, setTermExpand1] = useState(false);
  const [termExpand2, setTermExpand2] = useState(false);

  const [payCategory, setPayCategory] = useState<'pay' | 'other'>('pay');
  const [selectedPayMethod, setSelectedPayMethod] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [prevStep, setPrevStep] = useState<string>(bookingStep);

  useEffect(() => {
    if (userProfile) {
      setBuyerName(userProfile.name || userProfile.nickname || '');
      setBuyerEmail(userProfile.email || '');
      setBuyerPhone(userProfile.phoneNumber || '');
    }
  }, [userProfile]);

  useEffect(() => {
    if (bookingStep !== prevStep) {
      setPrevStep(bookingStep);
    }
  }, [bookingStep, prevStep]);

  const slideDirection = bookingStep === 'PAYMENT' && prevStep === 'PAY_METHOD' ? -1 : 1;
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '50%' : '-50%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '50%' : '-50%',
      opacity: 0
    })
  };

  const priceGradeSeats: Record<string, any[]> = {};
  if (optionsData?.seats) {
    optionsData.seats.forEach(seat => {
      if (!priceGradeSeats[seat.priceGrade]) priceGradeSeats[seat.priceGrade] = [];
      priceGradeSeats[seat.priceGrade].push(seat);
    });
  }

  const ticketPrice = cancellationTotalAmount 
    ? Math.round(cancellationTotalAmount / 1.05) // 역산하여 티켓 가격 산출
    : Object.entries(priceGradeSeats).reduce((sum, [priceGrade, seats]) => {
    const baseSeat = seats[0];
    let types = baseSeat.priceInfos || [];
    
    if (types.length === 0 && optionsData) {
      const fallbackPrice = Math.floor(optionsData.totalTicketPriceAmount / Math.max(1, optionsData.seats.length));
      types = [{ discountName: '일반', discountRate: 0, ticketPriceAmount: fallbackPrice }];
    }
    
    const basePrice = types.find((t: any) => t.discountRate === 0)?.ticketPriceAmount || types[0]?.ticketPriceAmount || 0;

    const counts = priceGradeTicketCounts[priceGrade] || {};
    return sum + Object.entries(counts).reduce((s, [typeId, count]: [string, any]) => {
      const type = types.find((t: any) => t.discountName === typeId);
      const typePrice = type ? type.ticketPriceAmount : basePrice;
      return s + typePrice * count;
    }, 0);
  }, 0);

  const finalPrice = cancellationTotalAmount || Math.round(ticketPrice * 1.05); // 5% 예매 수수료 포함
  const bookingFee = finalPrice - ticketPrice;

  const handleAgreeAll = (val: boolean) => {
    setAgreeAll(val);
    setAgreeTerm1(val);
    setAgreeTerm2(val);
  };

  const canPay = buyerName.trim() && buyerEmail.trim() && buyerPhone.trim() && agreeTerm1 && agreeTerm2;

  const payMethods = [
    {
      id: 'kakaopay',
      label: '카카오페이',
      selectedColor: 'border-[#FEE500] bg-[#FEE500] text-[#381E1F]',
      icon: <Image src="/images/payment_icon_yellow_small.png" alt="카카오페이" width={60} height={20} className="h-5 object-contain mr-2" style={{ width: 'auto' }} />,
      disabled: false
    },
    {
      id: 'naverpay',
      label: '네이버페이',
      selectedColor: 'border-[#03C75A] bg-[#03C75A] text-white',
      icon: <Image src="/images/logo_npaybk_large.svg" alt="네이버페이" width={60} height={20} className="h-5 object-contain mr-2" style={{ width: 'auto' }} />,
      disabled: true
    },
    {
      id: 'tosspay',
      label: '토스페이',
      selectedColor: 'border-[#3182F6] bg-[#3182F6] text-white',
      icon: <Image src="/images/Toss_Symbol_Primary.png" alt="토스페이" width={60} height={20} className="h-5 object-contain mr-2" style={{ width: 'auto' }} />,
      disabled: true
    },
    {
      id: 'payco',
      label: 'PAYCO',
      selectedColor: 'border-[#E31C18] bg-[#E31C18] text-white',
      icon: <span className="w-5 h-5 flex items-center justify-center bg-white text-[#E31C18] border border-[#E31C18] rounded-[4px] text-[13px] font-black mr-2 leading-none italic">P</span>,
      disabled: true
    },
  ];

  const otherMethods = [
    {
      id: 'credit',
      label: '신용카드',
      selectedColor: 'border-blue-500 bg-blue-500 text-white shadow-md',
      icon: null,
      disabled: true
    },
    {
      id: 'bank',
      label: '계좌이체',
      selectedColor: 'border-blue-500 bg-blue-500 text-white shadow-md',
      icon: null,
      disabled: true
    },
    {
      id: 'phone',
      label: '휴대폰 결제',
      selectedColor: 'border-blue-500 bg-blue-500 text-white shadow-md',
      icon: null,
      disabled: true
    },
    {
      id: 'vbank',
      label: '무통장입금',
      selectedColor: 'border-blue-500 bg-blue-500 text-white shadow-md',
      icon: null,
      disabled: false
    },
  ];

  const handlePayment = async () => {
    if (!storyMode && !cancellationId && (!scheduleId || !preorderBookingId || !selectedPayMethod)) {
      console.error('Missing required payment parameters:', { scheduleId, preorderBookingId, selectedPayMethod });
      return;
    }
    if (storyMode && !selectedPayMethod) {
      console.error('Missing selectedPayMethod:', { selectedPayMethod });
      return;
    }
    if (!userId) {
      onError('로그인 필요', '로그인이 필요합니다.');
      window.location.href = '/login';
      return;
    }

    setIsProcessing(true);
    try {
      const paymentMethod = selectedPayMethod === 'kakaopay' ? 'KAKAOPAY' : 'BANK_TRANSFER';

      if (storyMode) {
        if (paymentMethod === 'KAKAOPAY') {
          setIsStorybookMockOpen(true);
        } else {
          router.push(`/payment/success?paymentId=mock_vbank_123&method=vbank`);
        }
        setIsProcessing(false);
        return;
      }

      if (cancellationId) {
        const res = await purchaseCancellation(cancellationId.toString(), { paymentMethod });
        const result = res.data;
        
        if (result.paymentMethod === 'BANK_TRANSFER') {
          (window as any).__isNavigatingToPayment__ = true;
          router.push(`/payment/success?bookingId=${result.bookingId}&method=vbank`);
          return;
        } else if (result.paymentMethod === 'KAKAOPAY') {
          const redirectUrl = result.redirectUrl;
          if (redirectUrl) {
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (isMobile) {
              (window as any).__isNavigatingToPayment__ = true;
              window.location.href = redirectUrl;
            } else {
              setIsKakaoPopupOpen(true);
              const popup = window.open(redirectUrl, 'kakaopay', 'width=500,height=700,scrollbars=yes');
              
              const bookingId = result.bookingId;
              let paymentHandled = false;
              const checkPopupInterval = setInterval(async () => {
                if (!popup || paymentHandled) return;
                
                if (popup.closed) {
                  clearInterval(checkPopupInterval);
                  if (!paymentHandled) {
                    if (bookingId) {
                      try {
                        const statusRes = await reservationApi.getReservationDetail(bookingId.toString());
                        if (statusRes.data?.bookingStatus === 'CONFIRMED' || statusRes.data?.bookingStatus === 'BOOKED') {
                          paymentHandled = true;
                          setIsKakaoPopupOpen(false);
                          (window as any).__isNavigatingToPayment__ = true;
                          router.push(`/payment/success?bookingId=${bookingId}`);
                          return;
                        }
                      } catch (e) {}
                    }
                    setIsKakaoPopupOpen(false);
                    setIsProcessing(false);
                    onError('결제 중단', '결제 창이 닫혔습니다.\n결제를 다시 시도해주세요.');
                    setBookingStep('PAY_METHOD');
                  }
                  return;
                }

                if (bookingId) {
                  try {
                    const statusRes = await reservationApi.getReservationDetail(bookingId.toString());
                    const bookingStatus = statusRes.data?.bookingStatus;
                    if (bookingStatus === 'CONFIRMED' || bookingStatus === 'BOOKED') {
                      paymentHandled = true;
                      clearInterval(checkPopupInterval);
                      try { popup.close(); } catch (e) {}
                      setIsKakaoPopupOpen(false);
                      (window as any).__isNavigatingToPayment__ = true;
                      router.push(`/payment/success?bookingId=${bookingId}`);
                    }
                  } catch (e) {}
                }
              }, 2000);
            }
          }
          return;
        }
      }

      const selectRes = await paymentApi.selectPaymentMethod(
        eventId,
        scheduleId!,
        { bookingId: preorderBookingId!, paymentMethod }
      );

      const nextAction = selectRes.data?.nextAction;

      const baseUrl = process.env.NEXT_PUBLIC_PAYMENT_BASE_URL || window.location.origin;

      if (paymentMethod === 'BANK_TRANSFER' && selectRes.data?.bankTransfer) {
        // 1-step 방식: select-method 응답에 이미 무통장 입금 정보가 있는 경우
        (window as any).__isNavigatingToPayment__ = true;
        router.push(`/payment/success?paymentId=${selectRes.data.bankTransfer.paymentId}&method=vbank`);
      } else if (nextAction === 'PREPARE_BANK_TRANSFER') {
        // 기존 2-step 방식에 대한 하위 호환성 유지
        const bankRes = await paymentApi.confirmBankTransferPayment(
          eventId,
          scheduleId!,
          { bookingId: preorderBookingId! }
        );
        if (bankRes.data) {
          (window as any).__isNavigatingToPayment__ = true;
          router.push(`/payment/success?paymentId=${bankRes.data.paymentId}&method=vbank`);
        }
      } else if (nextAction === 'PREPARE_KAKAOPAY' || paymentMethod === 'KAKAOPAY') {
        if (storyMode) {
          setIsStorybookMockOpen(true);
          return;
        }

        const kakaoRes = await paymentApi.readyKakaoPay(
          eventId,
          scheduleId!,
          {
            bookingId: preorderBookingId!
          }
        );

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const redirectUrl = isMobile
          ? (kakaoRes.data?.nextRedirectMobileUrl || kakaoRes.data?.nextRedirectPcUrl)
          : kakaoRes.data?.nextRedirectPcUrl;

        if (redirectUrl) {
          if (isMobile) {
            (window as any).__isNavigatingToPayment__ = true;
            window.location.href = redirectUrl;
          } else {
            // PC: 새 창으로 띄우고 메시지 리스너 등록
            setIsKakaoPopupOpen(true);
            const popup = window.open(redirectUrl, 'kakaopay', 'width=500,height=700,scrollbars=yes');
            popupRef.current = popup;

            // 부모 창에서 백엔드 결제 상태를 폴링하여 결제 완료를 감지
            // (카카오페이 리다이렉트가 다른 도메인으로 가므로 팝업 URL을 직접 읽을 수 없음)
            const kakaoPaymentId = kakaoRes.data?.paymentId;
            let paymentHandled = false;

            const checkPopupInterval = setInterval(async () => {
              if (!popup || paymentHandled) return;

              // 팝업이 닫힌 경우 (사용자가 직접 닫음)
              if (popup.closed) {
                clearInterval(checkPopupInterval);
                if (!paymentHandled) {
                  // 팝업이 닫혔지만 결제가 완료되었을 수 있으므로 한 번 더 확인
                  if (kakaoPaymentId) {
                    try {
                      const statusRes = await paymentApi.getPaymentStatus(kakaoPaymentId);
                      if (statusRes.data?.bookingStatus === 'CONFIRMED' || statusRes.data?.paymentStatus === 'PAID') {
                        paymentHandled = true;
                        setIsKakaoPopupOpen(false);
                        (window as any).__isNavigatingToPayment__ = true;
                        router.push(`/payment/success?bookingId=${statusRes.data.bookingId}&paymentId=${kakaoPaymentId}`);
                        return;
                      }
                    } catch (e) {
                      // 상태 확인 실패 시 그냥 결제 중단 처리
                    }
                  }
                  setIsKakaoPopupOpen(false);
                  setIsProcessing(false);
                  onError('결제 중단', '결제 창이 닫혔습니다.\n결제를 다시 시도해주세요.');
                  setBookingStep('PAY_METHOD');
                }
                return;
              }

              // 백엔드에 결제 상태 폴링
              if (kakaoPaymentId) {
                try {
                  const statusRes = await paymentApi.getPaymentStatus(kakaoPaymentId);
                  const paymentStatus = statusRes.data?.paymentStatus;
                  const bookingStatus = statusRes.data?.bookingStatus;

                  if (paymentStatus === 'PAID' || bookingStatus === 'CONFIRMED') {
                    // 결제 성공!
                    paymentHandled = true;
                    clearInterval(checkPopupInterval);
                    
                    // 팝업 닫기 시도
                    try { popup.close(); } catch (e) { /* 무시 */ }
                    setIsKakaoPopupOpen(false);

                    (window as any).__isNavigatingToPayment__ = true;
                    router.push(`/payment/success?bookingId=${statusRes.data.bookingId}&paymentId=${kakaoPaymentId}`);
                  } else if (paymentStatus === 'CANCELLED' || paymentStatus === 'FAILED') {
                    // 결제 실패/취소
                    paymentHandled = true;
                    clearInterval(checkPopupInterval);
                    
                    try { popup.close(); } catch (e) { /* 무시 */ }
                    setIsKakaoPopupOpen(false);
                    setIsProcessing(false);
                    
                    if (paymentStatus === 'CANCELLED') {
                      onError('결제 취소', '결제가 취소되었습니다.\n다시 시도해주세요.');
                    } else {
                      onError('결제 실패', '결제 중 오류가 발생했습니다.\n다시 시도해주세요.');
                    }
                    setBookingStep('PAY_METHOD');
                  }
                  // PENDING/READY 등 아직 결제 진행 중이면 계속 폴링
                } catch (e) {
                  // 폴링 실패 시 무시 (다음 interval에서 재시도)
                }
              }
            }, 2000);
            pollingIntervalRef.current = checkPopupInterval;
          }
        }
      }
    } catch (err: any) {
      console.error('Payment failed', err);

      if (err.status === 400) {
        onError('요청 오류', '지원하지 않는 결제 수단이거나 잘못된 요청입니다.');
      } else if (err.status === 404) {
        onError('정보 없음', '예매 초안 또는 회차 정보를 찾을 수 없습니다.');
      } else if (err.status === 409) {
        onError('상태 오류', '현재 예매 상태에서는 해당 결제 요청을 처리할 수 없습니다.');
      } else {
        onError('결제 오류', err.message || '결제 처리 중 오류가 발생했습니다.');
      }

      setIsProcessing(false);
    }
  };

  const renderSummaryContent = () => (
    <div className="flex-1 lg:overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
        <div className="px-5 py-4 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 rounded-t-2xl">
          <h3 className="font-extrabold text-[16px] text-gray-900 dark:text-white">좌석 정보</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {cancellationId ? (
            <div className="px-5 py-4 flex flex-col gap-1.5">
              <span className="font-bold text-gray-900 dark:text-white text-[15px]">취소표 1매</span>
              <span className="text-[13px] text-gray-500 leading-none">배정된 취소표</span>
            </div>
          ) : Object.entries(priceGradeSeats).map(([priceGrade, seats]) => {
            const dotClass = priceGradeDotColors[priceGrade] || 'bg-gray-400';
            const counts = priceGradeTicketCounts[priceGrade] || {};
            let priceGradeTotalPrice = 0;

            const baseSeat = seats[0];
            let types = baseSeat.priceInfos || [];
            
            if (types.length === 0 && optionsData) {
              const fallbackPrice = Math.floor(optionsData.totalTicketPriceAmount / Math.max(1, optionsData.seats.length));
              types = [{ discountName: '일반', discountRate: 0, ticketPriceAmount: fallbackPrice }];
            }

            Object.entries(counts).forEach(([typeId, count]: [string, any]) => {
              const typeInfo = types.find((t: any) => t.discountName === typeId);
              if (typeInfo) {
                priceGradeTotalPrice += (count as number) * typeInfo.ticketPriceAmount;
              }
            });

            return (
              <div key={priceGrade} className="px-5 py-4 flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${dotClass}`} />
                    <span className="font-bold text-gray-900 dark:text-white text-[15px]">{priceGrade}석</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 ml-5 mt-0.5">
                    <span className="text-[13px] text-gray-500 leading-none">{seats.map(s => s.seatLabel).join(', ')}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(counts).filter(([, c]: [string, any]) => (c as number) > 0).map(([typeId, count]: [string, any]) => {
                        return (
                          <span key={typeId} className="text-[11px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium px-2 py-0.5 rounded-md">
                            {typeId} {count as number}매
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <span className="font-extrabold text-gray-900 dark:text-white text-sm">
                  {priceGradeTotalPrice > 0 ? `${priceGradeTotalPrice.toLocaleString()}원` : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
        <div className="px-5 py-4 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 rounded-t-2xl">
          <h3 className="font-extrabold text-[16px] text-gray-900 dark:text-white">결제 금액</h3>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">티켓 금액</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{ticketPrice.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">예매 수수료 (5%)</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{bookingFee.toLocaleString()}원</span>
          </div>
          <div className="h-px bg-gray-200 dark:bg-zinc-700 my-1" />
          <div className="flex justify-between items-center">
            <span className="text-base font-extrabold text-gray-900 dark:text-white">총 결제 금액</span>
            <span className="text-xl font-extrabold text-blue-600">{finalPrice.toLocaleString()}원</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBackButton = (containerClassName: string) => (
    <div className={`p-4 sm:p-6 bg-white dark:bg-zinc-950 z-20 shrink-0 border-b border-gray-100 dark:border-zinc-800 ${containerClassName}`}>
      <button
        onClick={() => {
          if (bookingStep === 'PAYMENT') {
            onCancel();
          } else {
            setBookingStep('PAYMENT');
          }
        }}
        disabled={isProcessing}
        className="px-4 py-2 text-gray-600 dark:text-gray-300 font-bold text-sm border border-gray-300 dark:border-zinc-600 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 w-max"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        전단계로 돌아가기
      </button>
    </div>
  );

  const renderPaymentButton = () => {
    if (bookingStep === 'PAYMENT') {
      return (
        <button
          disabled={!canPay || isProcessing}
          onClick={() => setBookingStep('PAY_METHOD')}
          className={`w-full py-4 rounded-2xl font-extrabold text-lg transition-all ${canPay && !isProcessing
            ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-lg shadow-blue-600/25'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
        >
          결제 수단 선택
        </button>
      );
    }
    return (
      <button
        disabled={!selectedPayMethod || isProcessing}
        onClick={handlePayment}
        className={`w-full py-4 rounded-2xl font-extrabold text-lg transition-all ${selectedPayMethod && !isProcessing
          ? 'bg-red-500 text-white hover:bg-red-600 active:scale-[0.98] shadow-lg shadow-red-500/25'
          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        data-track-id="payment-confirm"
      >
        {isProcessing ? '처리 중...' : `${finalPrice.toLocaleString()}원 결제하기`}
      </button>
    );
  };

  return (
    <div className="absolute inset-0 top-[73px] flex flex-col lg:flex-row bg-gray-50 dark:bg-zinc-950 z-40 animate-fade-in border-t border-gray-200 dark:border-zinc-800 overflow-hidden">
      
      {/* 팝업 오버레이 */}
      {isKakaoPopupOpen && (
        <div className="absolute inset-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6" />
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-3">결제 진행 중입니다</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center leading-relaxed">
            새 창에서 카카오페이 결제를 완료해 주세요.<br />
            결제가 완료되면 이 화면은 자동으로 넘어갑니다.
          </p>
          <button
            onClick={() => {
              if (popupRef.current) {
                try { popupRef.current.close(); } catch (e) { /* 무시 */ }
                popupRef.current = null;
              }
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              setIsKakaoPopupOpen(false);
              setIsProcessing(false);
              onError('결제 취소', '결제가 강제로 취소되었습니다.\n결제 수단을 다시 선택해주세요.');
              setBookingStep('PAY_METHOD');
            }}
            className="mt-8 px-6 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
          >
            결제 창이 안 보이나요? (강제 취소 및 닫기)
          </button>
        </div>
      )}

      {/* Mobile-only Back Button */}
      {renderBackButton("lg:hidden")}

      {/* Mobile Top Summary (Visible only on mobile/tablet) */}
      <div className="lg:hidden w-full px-4 sm:px-6 pb-4 bg-white dark:bg-zinc-950 z-30 shrink-0 border-b border-gray-100 dark:border-zinc-800">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div 
            className="flex items-center justify-between p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800"
            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-700 dark:text-gray-300">총 결제 금액</span>
              <span className="font-extrabold text-blue-600 dark:text-blue-400 text-lg">{finalPrice.toLocaleString()}원</span>
            </div>
            <button className="p-1 text-gray-400 transition-transform duration-300">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isSummaryExpanded ? 'rotate-180' : ''}>
                 <polyline points="6 9 12 15 18 9"></polyline>
               </svg>
            </button>
          </div>
          <AnimatePresence>
            {isSummaryExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-gray-50 dark:bg-zinc-950 border-t border-gray-100 dark:border-zinc-800"
              >
                <div className="max-h-[50vh] overflow-y-auto">
                  {renderSummaryContent()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content Area (Left on desktop, bottom on mobile) */}
      <div className="w-full lg:w-[60%] flex-1 flex flex-col relative overflow-hidden bg-white dark:bg-zinc-950 lg:border-r border-gray-200 dark:border-zinc-800">
        
        {/* Desktop-only Back Button */}
        {renderBackButton("hidden lg:block")}

        <div className="flex-1 relative overflow-hidden bg-white dark:bg-zinc-950">
          <AnimatePresence initial={false} custom={slideDirection}>
            {bookingStep === 'PAYMENT' ? (
              <motion.div
                key="PAYMENT"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute inset-0 overflow-y-auto px-4 sm:px-8 pb-[100px] lg:pb-8 flex flex-col gap-6 pt-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {/* 예매자 정보 */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                  <div className="px-5 py-4 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 rounded-t-2xl">
                    <h3 className="font-extrabold text-[16px] text-gray-900 dark:text-white">예매자 정보</h3>
                  </div>
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <label className="sm:w-24 text-sm font-bold text-gray-600 dark:text-gray-400 shrink-0">예매자 이름</label>
                      <input
                        type="text"
                        value={buyerName}
                        onChange={e => setBuyerName(e.target.value)}
                        placeholder="이름 입력"
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <label className="sm:w-24 text-sm font-bold text-gray-600 dark:text-gray-400 shrink-0">이메일</label>
                      <input
                        type="email"
                        value={buyerEmail}
                        onChange={e => setBuyerEmail(e.target.value)}
                        placeholder="이메일 입력"
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <label className="sm:w-24 text-sm font-bold text-gray-600 dark:text-gray-400 shrink-0">전화번호</label>
                      <input
                        type="tel"
                        value={buyerPhone}
                        onChange={e => setBuyerPhone(e.target.value)}
                        placeholder="전화번호 입력"
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* 약관 동의 */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm mb-4 lg:mb-0">
                  <div className="px-5 py-4 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 rounded-t-2xl">
                    <h3 className="font-extrabold text-[16px] text-gray-900 dark:text-white">약관 동의</h3>
                  </div>
                  <div className="p-5 flex flex-col gap-3">
                    {/* 전체 동의 */}
                    <div className="flex items-center gap-3 px-4 py-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <Toggle checked={agreeAll} onChange={handleAgreeAll} size="small" />
                      <span className="font-bold text-blue-700 dark:text-blue-400 text-sm">전체 동의합니다.</span>
                    </div>

                    {/* 예매 이용 약관 */}
                    <div className={`rounded-xl border transition-colors ${agreeTerm1 ? 'border-blue-200 dark:border-blue-800' : 'border-gray-200 dark:border-zinc-700'}`}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <Toggle checked={agreeTerm1} onChange={(val) => { setAgreeTerm1(val); if (!val) setAgreeAll(false); else if (agreeTerm2) setAgreeAll(true); }} size="small" />
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">예매 이용 약관 (필수)</span>
                        <button
                          onClick={() => setTermExpand1(!termExpand1)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-full transition-colors"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            className={`transition-transform duration-300 text-gray-400 ${termExpand1 ? 'rotate-180' : ''}`}
                          >
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      </div>
                      <div className={`grid transition-all duration-300 ease-in-out ${termExpand1 ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden min-h-0">
                          <div className="px-4 pb-4">
                            <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-h-32 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                              <p className="font-bold mb-2">제1조 (목적)</p>
                              <p className="mb-2">이 약관은 티클(이하 "회사")이 제공하는 온라인 예매 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
                              <p className="font-bold mb-2">제2조 (예매 서비스)</p>
                              <p className="mb-2">예매 완료 후 취소 시 취소 수수료가 부과될 수 있으며, 공연일 기준 7일 전까지 무료 취소가 가능합니다. 공연 당일 취소 및 환불은 불가합니다.</p>
                              <p className="font-bold mb-2">제3조 (티켓 양도)</p>
                              <p>예매된 티켓은 타인에게 양도할 수 없으며, 부정 양도 적발 시 입장이 제한될 수 있습니다.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 개인정보 수집 동의 */}
                    <div className={`rounded-xl border transition-colors ${agreeTerm2 ? 'border-blue-200 dark:border-blue-800' : 'border-gray-200 dark:border-zinc-700'}`}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <Toggle checked={agreeTerm2} onChange={(val) => { setAgreeTerm2(val); if (!val) setAgreeAll(false); else if (agreeTerm1) setAgreeAll(true); }} size="small" />
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">개인정보 수집 동의 (필수)</span>
                        <button
                          onClick={() => setTermExpand2(!termExpand2)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-full transition-colors"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            className={`transition-transform duration-300 text-gray-400 ${termExpand2 ? 'rotate-180' : ''}`}
                          >
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      </div>
                      <div className={`grid transition-all duration-300 ease-in-out ${termExpand2 ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden min-h-0">
                          <div className="px-4 pb-4">
                            <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-h-32 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                              <p className="font-bold mb-2">수집 항목</p>
                              <p className="mb-2">예매자 이름, 이메일, 전화번호, 결제 정보</p>
                              <p className="font-bold mb-2">수집 목적</p>
                              <p className="mb-2">예매 확인 및 안내, 본인 확인, 고객 상담, 마케팅 정보 제공 (선택 동의 시)</p>
                              <p className="font-bold mb-2">보유 기간</p>
                              <p>공연 종료 후 3개월까지 보관하며, 관련 법령에 의한 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="PAY_METHOD"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute inset-0 overflow-y-auto px-4 sm:px-8 pb-[100px] lg:pb-8 flex flex-col gap-6 pt-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {/* 결제 수단 선택 */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm mb-4 lg:mb-0">
                  <div className="px-5 py-4 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 rounded-t-2xl flex items-center justify-between">
                    <h3 className="font-extrabold text-[16px] text-gray-900 dark:text-white">결제 수단</h3>
                  </div>
                  <div className="p-5 flex flex-col gap-3">
                    {/* 페이 결제 */}
                    <div
                      className={`rounded-xl border-2 transition-all cursor-pointer ${payCategory === 'pay'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300'
                        }`}
                      onClick={() => { setPayCategory('pay'); setSelectedPayMethod(null); }}
                    >
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${payCategory === 'pay' ? 'border-blue-500' : 'border-gray-300'
                          }`}>
                          {payCategory === 'pay' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                        </div>
                        <span className={`font-bold text-sm ${payCategory === 'pay' ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                          }`}>페이 결제</span>
                      </div>
                      <div className={`grid transition-all duration-300 ease-in-out ${payCategory === 'pay' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden min-h-0">
                          <div className="px-4 pb-4 pt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {payMethods.map(m => (
                              <button
                                key={m.id}
                                disabled={m.disabled}
                                onClick={(e) => { e.stopPropagation(); setSelectedPayMethod(m.id); }}
                                className={`relative py-4 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center ${m.disabled
                                  ? 'bg-gray-50 border-gray-100 text-gray-400 opacity-60 cursor-not-allowed dark:bg-zinc-800 dark:border-zinc-800 dark:text-gray-500'
                                  : `hover:z-10 ${selectedPayMethod === m.id
                                    ? `${m.selectedColor} shadow-sm scale-[1.02] z-10`
                                    : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-600 hover:border-gray-400 z-0'
                                  }`
                                  }`}
                              >
                                {m.icon}
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 다른 결제 방법 */}
                    <div
                      className={`rounded-xl border-2 transition-all cursor-pointer ${payCategory === 'other'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300'
                        }`}
                      onClick={() => { setPayCategory('other'); setSelectedPayMethod(null); }}
                    >
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${payCategory === 'other' ? 'border-blue-500' : 'border-gray-300'
                          }`}>
                          {payCategory === 'other' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                        </div>
                        <span className={`font-bold text-sm ${payCategory === 'other' ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                          }`}>다른 결제 방법</span>
                      </div>
                      <div className={`grid transition-all duration-300 ease-in-out ${payCategory === 'other' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden min-h-0">
                          <div className="px-4 pb-4 pt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {otherMethods.map(m => (
                              <button
                                key={m.id}
                                disabled={m.disabled}
                                onClick={(e) => { e.stopPropagation(); setSelectedPayMethod(m.id); }}
                                className={`relative py-4 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center ${m.disabled
                                  ? 'bg-gray-50 border-gray-100 text-gray-400 opacity-60 cursor-not-allowed dark:bg-zinc-800 dark:border-zinc-800 dark:text-gray-500'
                                  : `hover:z-10 ${selectedPayMethod === m.id
                                    ? `${m.selectedColor} shadow-sm scale-[1.02] z-10`
                                    : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-600 hover:border-gray-400 z-0'
                                  }`
                                  }`}
                              >
                                {m.icon}
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Desktop Right Summary (Visible only on desktop) */}
      <div className="hidden lg:flex lg:w-[40%] h-full flex-col bg-gray-50 dark:bg-zinc-950 shrink-0 z-20">
        {renderSummaryContent()}
        <div className="p-6 shrink-0 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          {renderPaymentButton()}
        </div>
      </div>

      {/* Mobile Fixed Payment Button */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full p-4 sm:p-6 bg-white dark:bg-zinc-950 border-t border-gray-200 dark:border-zinc-800 z-40">
        {renderPaymentButton()}
      </div>

    </div>
  );
};
