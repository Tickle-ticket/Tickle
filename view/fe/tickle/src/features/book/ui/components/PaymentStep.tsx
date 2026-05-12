import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PaymentInfoStep } from './PaymentInfoStep';
import { PayMethodStep } from './PayMethodStep';
import { useBookStore } from '../../store/useBookStore';
import { BookingOptionsResponse } from '@/src/shared/api/types/booking.types';
import { paymentApi } from '@/src/shared/api/paymentApi';
import { purchaseCancellation } from '@/src/shared/api/cancellationApi';
import { reservationApi } from '@/src/shared/api/reservationApi';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { isShadowMode } from '@/src/shared/utils/shadowMode';

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
  onPaymentComplete?: () => void;
  isStandalone?: boolean;
  onStepChange?: (step: string) => void;
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
  onPaymentComplete,
  isStandalone = false,
  onStepChange,
}) => {
  const bookingStep = useBookStore((s: any) => s.bookingStep);
  const setBookingStep = useBookStore((s: any) => s.setBookingStep);
  const priceGradeTicketCounts = useBookStore((s: any) => s.priceGradeTicketCounts);

  const router = useRouter();
  const [isKakaoPopupOpen, setIsKakaoPopupOpen] = useState(false);
  const [isStorybookMockOpen, setIsStorybookMockOpen] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 약관 동의 상태 (PaymentInfoStep에서 관리, canPay로 보고받음)
  const [canPay, setCanPay] = useState(false);
  const handleCanPay = useCallback((val: boolean) => setCanPay(val), []);

  // 결제 수단 상태 (PayMethodStep에서 관리, 보고받음)
  const [selectedPayMethod, setSelectedPayMethod] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [prevStep, setPrevStep] = useState<string>(bookingStep);

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




  const handlePayment = async () => {
    const isShadow = storyMode || isShadowMode(eventId);

    if (!isShadow && !cancellationId && (!scheduleId || !preorderBookingId || !selectedPayMethod)) {
      console.error('Missing required payment parameters:', { scheduleId, preorderBookingId, selectedPayMethod });
      return;
    }
    if (isShadow && !selectedPayMethod) {
      console.error('Missing selectedPayMethod:', { selectedPayMethod });
      return;
    }
    if (!isShadow && !userId) {
      onError('로그인 필요', '로그인이 필요합니다.');
      window.location.href = '/login';
      return;
    }

    setIsProcessing(true);
    try {
      const paymentMethod = selectedPayMethod === 'kakaopay' ? 'KAKAOPAY' : 'BANK_TRANSFER';

      if (isShadow) {
        if (paymentMethod === 'KAKAOPAY') {
          setIsStorybookMockOpen(true);
        } else {
          onPaymentComplete?.();
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
          onPaymentComplete?.();
          router.push(`/payment/success?bookingId=${result.bookingId}&method=vbank`);
          return;
        } else if (result.paymentMethod === 'KAKAOPAY') {
          const redirectUrl = result.redirectUrl;
          if (redirectUrl) {
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (isMobile) {
              (window as any).__isNavigatingToPayment__ = true;
              onPaymentComplete?.();
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
                          onPaymentComplete?.();
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
                      onPaymentComplete?.();
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
        onPaymentComplete?.();
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
          onPaymentComplete?.();
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
                        onPaymentComplete?.();
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
                    onPaymentComplete?.();
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
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 rounded-t-2xl">
          <h3 className="font-extrabold text-[16px] text-gray-900">좌석 정보</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {cancellationId ? (
            <div className="px-5 py-4 flex flex-col gap-1.5">
              <span className="font-bold text-gray-900 text-[15px]">취소표 1매</span>
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
                    <span className="font-bold text-gray-900 text-[15px]">{priceGrade}석</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 ml-5 mt-0.5">
                    <span className="text-[13px] text-gray-500 leading-none">{seats.map(s => s.seatLabel).join(', ')}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(counts).filter(([, c]: [string, any]) => (c as number) > 0).map(([typeId, count]: [string, any]) => {
                        return (
                          <span key={typeId} className="text-[11px] bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-md">
                            {typeId} {count as number}매
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <span className="font-extrabold text-gray-900 text-sm">
                  {priceGradeTotalPrice > 0 ? `${priceGradeTotalPrice.toLocaleString()}원` : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 rounded-t-2xl">
          <h3 className="font-extrabold text-[16px] text-gray-900">결제 금액</h3>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">티켓 금액</span>
            <span className="text-sm font-bold text-gray-900">{ticketPrice.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">예매 수수료 (5%)</span>
            <span className="text-sm font-bold text-gray-900">{bookingFee.toLocaleString()}원</span>
          </div>
          <div className="h-px bg-gray-200 my-1" />
          <div className="flex justify-between items-center">
            <span className="text-base font-extrabold text-gray-900">총 결제 금액</span>
            <span className="text-xl font-extrabold text-blue-600">{finalPrice.toLocaleString()}원</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBackButton = (containerClassName: string) => (
    <div className={`p-4 sm:p-6 bg-white z-20 shrink-0 border-b border-gray-100 ${containerClassName}`}>
      <button
        onClick={() => {
          if (bookingStep === 'PAYMENT') {
            onCancel();
          } else {
            setBookingStep('PAYMENT');
          }
        }}
        disabled={isProcessing}
        className="px-4 py-2 text-gray-600 font-bold text-sm border border-gray-300 rounded-xl hover:bg-gray-50:bg-zinc-800 transition-colors flex items-center gap-2 w-max"
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
          onClick={() => { setBookingStep('PAY_METHOD'); onStepChange?.('pay_method'); }}
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
    <div className="absolute inset-0 top-[73px] flex flex-col lg:flex-row bg-gray-50 z-40 animate-fade-in border-t border-gray-200 overflow-hidden">
      
      {/* 팝업 오버레이 */}
      {isKakaoPopupOpen && (
        <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6" />
          <h2 className="text-2xl font-extrabold text-gray-900 mb-3">결제 진행 중입니다</h2>
          <p className="text-gray-500 text-center leading-relaxed">
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
            className="mt-8 px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200:bg-zinc-700 transition-colors"
          >
            결제 창이 안 보이나요? (강제 취소 및 닫기)
          </button>
        </div>
      )}

      {/* Mobile-only Back Button */}
      {renderBackButton("lg:hidden")}

      {/* Mobile Top Summary (Visible only on mobile/tablet) */}
      <div className="lg:hidden w-full px-4 sm:px-6 pb-4 bg-white z-30 shrink-0 border-b border-gray-100">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div 
            className="flex items-center justify-between p-4 cursor-pointer transition-colors hover:bg-gray-50:bg-zinc-800"
            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-700">총 결제 금액</span>
              <span className="font-extrabold text-blue-600 text-lg">{finalPrice.toLocaleString()}원</span>
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
                className="bg-gray-50 border-t border-gray-100"
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
      <div className="w-full lg:w-[60%] flex-1 flex flex-col relative overflow-hidden bg-white lg:border-r border-gray-200">
        
        {/* Desktop-only Back Button */}
        {renderBackButton("hidden lg:block")}

        <div className="flex-1 relative overflow-hidden bg-white">
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
                <PaymentInfoStep userProfile={userProfile} onCanPay={handleCanPay} />
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
                <PayMethodStep selectedPayMethod={selectedPayMethod} setSelectedPayMethod={setSelectedPayMethod} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Desktop Right Summary (Visible only on desktop) */}
      <div className="hidden lg:flex lg:w-[40%] h-full flex-col bg-gray-50 shrink-0 z-20">
        {renderSummaryContent()}
        <div className="p-6 shrink-0 border-t border-gray-200 bg-white">
          {renderPaymentButton()}
        </div>
      </div>

      {/* Mobile Fixed Payment Button */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full p-4 sm:p-6 bg-white border-t border-gray-200 z-40">
        {renderPaymentButton()}
      </div>

    </div>
  );
};
