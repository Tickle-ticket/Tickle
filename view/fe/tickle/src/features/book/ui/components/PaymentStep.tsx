import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  markNavigatingToPayment,
  clearNavigatingToPayment,
} from '@/src/features/book/lib/paymentNavigation';
import { toErrorCode, toFailureTag } from '@/src/shared/api/errors';
import { PaymentInfoStep } from './PaymentInfoStep';
import { PayMethodStep } from './PayMethodStep';
import { useBookStore } from '../../store/useBookStore';
import {
  BookingOptionsResponse,
  type BookingSeatOptionResponse,
  type BookingPreorderResponse,
  type PreorderOptionSelection,
} from '@/src/shared/api/types/booking.types';
import { paymentApi } from '@/src/shared/api/paymentApi';
import { purchaseCancellation } from '@/src/shared/api/cancellationApi';
import { reservationApi } from '@/src/shared/api/reservationApi';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createBookFlowPolicy } from '@/src/features/book/api/bookFlowPolicy';
import {
  resolvePriceInfos,
  calculateGradeTotal,
  listGradeTicketPrices,
} from '@/src/features/book/api/priceInfo';
import { sumServiceFees, inferTicketPrice } from '@/src/features/book/api/serviceFee';
import { pollPaymentResult, type PaymentPollVerdict } from '@/src/features/book/lib/paymentPolling';
import type { UserProfileData } from '@/src/shared/api/useUserProfile';

interface PaymentStepProps {
  optionsData?: BookingOptionsResponse;
  preorderBookingId?: number | null;
  eventId: string;
  scheduleId?: string | null;
  userId: number | undefined;
  /** 구매자 정보 자동 입력에 쓴다. 조회 전이거나 비회원이면 없다. */
  userProfile: UserProfileData | null | undefined;
  onCancel: () => void;
  onConflictError: () => void;
  onError: (title: string, message: string) => void;
  cancellationId?: number;
  cancellationTotalAmount?: number;
  onPaymentComplete?: () => void;
  isStandalone?: boolean;
  onStepChange?: (step: string) => void;
  /** 결제하기 버튼 클릭 시 호출 (SSE 해제 등) */
  onPaymentStart?: () => void;
  submitPreorder?: (
    eventId: number,
    scheduleId: number,
    seatIds: number[],
    optionSelections: PreorderOptionSelection[],
  ) => Promise<BookingPreorderResponse | undefined>;
  setPreorderBookingId?: (id: number | null) => void;
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
  cancellationId,
  cancellationTotalAmount,
  onPaymentComplete,
  isStandalone = false,
  onStepChange,
  onPaymentStart,
  submitPreorder,
  setPreorderBookingId,
}) => {
  const paymentPolicy = createBookFlowPolicy('BOOK', eventId);

  const bookingStep = useBookStore((s) => s.bookingStep);
  const setBookingStep = useBookStore((s) => s.setBookingStep);
  const priceGradeTicketCounts = useBookStore((s) => s.priceGradeTicketCounts);
  const pendingOptionSelections = useBookStore((s) => s.pendingOptionSelections);

  const router = useRouter();
  const [isKakaoPopupOpen, setIsKakaoPopupOpen] = useState(false);
  // 폴링을 멈추면 팝업도 같이 닫힌다. 둘을 따로 들고 있으면 한쪽만 정리되기 쉽다.
  const cancelPollingRef = useRef<(() => void) | null>(null);

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

  // 결제 수단 선택으로 돌아왔다는 것은 결제가 취소·실패했다는 뜻이다.
  //
  // 카카오페이 팝업 결제는 페이지를 떠나지 않으므로 "결제 이동 중" 표시가 저절로
  // 사라지지 않는다. 지우지 않으면 이후 진짜 이탈에서도 좌석 선점이 풀리지 않고
  // 이탈 경고도 뜨지 않아, 그 좌석이 만료까지 잠긴 채 남는다.
  useEffect(() => {
    if (bookingStep === 'PAY_METHOD') {
      clearNavigatingToPayment();
    }
  }, [bookingStep]);

  // 결제 폴링은 컴포넌트가 사라져도 멈추지 않는다. 뒤로가기나 라우팅 이탈로
  // 언마운트되면 setInterval만 남아 2초마다 서버를 계속 때린다(사용자는 이미
  // 화면을 떠났고 setState는 아무 데도 반영되지 않는다). 언마운트 시 반드시 정리한다.
  useEffect(() => {
    return () => {
      cancelPollingRef.current?.();
      cancelPollingRef.current = null;
    };
  }, []);

  /**
   * 카카오페이 팝업을 띄우고 결과가 날 때까지 기다린 뒤 화면을 정리합니다.
   *
   * <p>일반 예매와 취소표 구매가 이 뒷정리를 각자 갖고 있었습니다. 성공·실패·중단
   * 어느 쪽이든 해야 할 일이 같아서 여기로 모읍니다.</p>
   *
   * @param redirectUrl 카카오페이 결제창 주소
   * @param checkStatus 서버 결제 상태를 조회하고 판정하는 함수
   * @param label       실패 로그에 남길 이름
   */
  const runKakaoPopupPayment = async (
    redirectUrl: string,
    checkStatus: () => Promise<PaymentPollVerdict>,
    label: string,
  ) => {
    const popup = window.open(redirectUrl, 'kakaopay', 'width=500,height=700,scrollbars=yes');
    if (!popup) {
      setIsProcessing(false);
      onError('결제창 차단', '팝업이 차단되었습니다.\n브라우저 설정에서 팝업을 허용해 주세요.');
      setBookingStep('PAY_METHOD');
      return;
    }

    setIsKakaoPopupOpen(true);
    const { promise, cancel } = pollPaymentResult({ popup, checkStatus, label });
    cancelPollingRef.current = cancel;

    const outcome = await promise;
    cancelPollingRef.current = null;
    setIsKakaoPopupOpen(false);

    if (outcome.kind === 'SUCCESS') {
      markNavigatingToPayment();
      onPaymentComplete?.();
      router.push(outcome.successUrl);
      return;
    }

    // 강제 취소 버튼이 이미 안내를 띄웠으므로 여기서 또 띄우지 않는다.
    if (outcome.kind === 'ABORTED') return;

    setIsProcessing(false);
    onError(outcome.title, outcome.message);
    setBookingStep('PAY_METHOD');
  };

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

  const priceGradeSeats: Record<string, BookingSeatOptionResponse[]> = {};
  if (optionsData?.seats) {
    optionsData.seats.forEach(seat => {
      if (!priceGradeSeats[seat.priceGrade]) priceGradeSeats[seat.priceGrade] = [];
      priceGradeSeats[seat.priceGrade].push(seat);
    });
  }

  // 선택된 티켓을 장당 가격으로 펼친다. 수수료를 좌석마다 계산해야 서버와 맞는다.
  const selectedTicketPrices = Object.entries(priceGradeSeats).flatMap(([priceGrade, seats]) =>
    listGradeTicketPrices(
      resolvePriceInfos(seats[0], optionsData),
      priceGradeTicketCounts[priceGrade] || {},
    ),
  );

  // 취소표는 서버가 총액만 내려준다. 총액을 나눠 티켓가를 되짚으면 서버가 버린
  // 1원 단위를 되살릴 수 없어 어긋나므로, 총액은 서버 값을 그대로 쓰고 수수료만
  // 같은 규칙으로 다시 구한다.
  const isCancellationPurchase = cancellationTotalAmount != null;
  const finalPrice = isCancellationPurchase
    ? cancellationTotalAmount
    : selectedTicketPrices.reduce((sum, price) => sum + price, 0) +
      sumServiceFees(selectedTicketPrices);
  const bookingFee = isCancellationPurchase
    ? finalPrice - inferTicketPrice(finalPrice)
    : sumServiceFees(selectedTicketPrices);
  const ticketPrice = finalPrice - bookingFee;




  const handlePayment = async () => {
    const isShadow = paymentPolicy.skipsServerCalls;

    if (!isShadow && !cancellationId && (!scheduleId || !selectedPayMethod)) {
      console.error('Missing required payment parameters:', { scheduleId, selectedPayMethod });
      return;
    }
    if (!isShadow && !cancellationId && !preorderBookingId && !pendingOptionSelections) {
      console.error('Missing booking data: neither preorderBookingId nor pendingOptionSelections available');
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

    // 결제 시작 시 SSE 등 외부 리소스 해제 트리거
    onPaymentStart?.();

    try {
      // 결제 확정 전 preorder API를 호출하여 예약 초안을 확정합니다.
      let currentBookingId = preorderBookingId;
      if (!currentBookingId && submitPreorder && pendingOptionSelections && scheduleId) {
        const preorderRes = await submitPreorder(
          parseInt(eventId, 10),
          parseInt(scheduleId, 10),
          pendingOptionSelections.seatIds,
          pendingOptionSelections.optionSelections
        );
        if (preorderRes?.bookingId) {
          currentBookingId = preorderRes.bookingId;
          setPreorderBookingId?.(preorderRes.bookingId);
        } else {
          onError('예약 실패', '예약 초안 생성에 실패했습니다. 다시 시도해주세요.');
          setIsProcessing(false);
          return;
        }
      }

      const paymentMethod = selectedPayMethod === 'kakaopay' ? 'KAKAOPAY' : 'BANK_TRANSFER';

      // shadow 공연은 서버에 결제 대상이 없다. 결제 수단과 무관하게 완료 화면으로
      // 보내 시나리오를 끝맺는다(카카오페이 외부 팝업도 띄우지 않는다).
      if (isShadow) {
        onPaymentComplete?.();
        router.push(
          `/payment/success?paymentId=mock_${paymentMethod === 'KAKAOPAY' ? 'kakaopay' : 'vbank'}_123&method=${paymentMethod === 'KAKAOPAY' ? 'kakaopay' : 'vbank'}`,
        );
        setIsProcessing(false);
        return;
      }

      if (cancellationId) {
        const res = await purchaseCancellation(cancellationId.toString(), { paymentMethod });
        const result = res.data;
        
        if (result.paymentMethod === 'BANK_TRANSFER') {
          markNavigatingToPayment();
          onPaymentComplete?.();
          router.push(`/payment/success?bookingId=${result.bookingId}&method=vbank`);
          return;
        } else if (result.paymentMethod === 'KAKAOPAY') {
          const redirectUrl = result.redirectUrl;
          if (redirectUrl) {
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (isMobile) {
              markNavigatingToPayment();
              onPaymentComplete?.();
              window.location.href = redirectUrl;
            } else {
              // 취소표는 예매 상세의 bookingStatus로 결제 완료를 판정한다.
              const bookingId = result.bookingId;
              await runKakaoPopupPayment(
                redirectUrl,
                async () => {
                  if (!bookingId) return { kind: 'PENDING' };
                  const statusRes = await reservationApi.getReservationDetail(bookingId.toString());
                  const bookingStatus = statusRes.data?.bookingStatus;
                  if (bookingStatus === 'CONFIRMED' || bookingStatus === 'BOOKED') {
                    return { kind: 'SUCCESS', successUrl: `/payment/success?bookingId=${bookingId}` };
                  }
                  return { kind: 'PENDING' };
                },
                '취소표',
              );
            }
          }
          return;
        }
      }

      const selectRes = await paymentApi.selectPaymentMethod(
        eventId,
        scheduleId!,
        { bookingId: currentBookingId!, paymentMethod }
      );

      const nextAction = selectRes.data?.nextAction;

      const baseUrl = process.env.NEXT_PUBLIC_PAYMENT_BASE_URL || window.location.origin;

      if (paymentMethod === 'BANK_TRANSFER' && selectRes.data?.bankTransfer) {
        // 1-step 방식: select-method 응답에 이미 무통장 입금 정보가 있는 경우
        markNavigatingToPayment();
        onPaymentComplete?.();
        router.push(`/payment/success?paymentId=${selectRes.data.bankTransfer.paymentId}&method=vbank`);
      } else if (nextAction === 'PREPARE_BANK_TRANSFER') {
        // 기존 2-step 방식에 대한 하위 호환성 유지
        const bankRes = await paymentApi.confirmBankTransferPayment(
          eventId,
          scheduleId!,
          { bookingId: currentBookingId! }
        );
        if (bankRes.data) {
          markNavigatingToPayment();
          onPaymentComplete?.();
          router.push(`/payment/success?paymentId=${bankRes.data.paymentId}&method=vbank`);
        }
      } else if (nextAction === 'PREPARE_KAKAOPAY' || paymentMethod === 'KAKAOPAY') {
        const kakaoRes = await paymentApi.readyKakaoPay(
          eventId,
          scheduleId!,
          {
            bookingId: currentBookingId!
          }
        );

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const redirectUrl = isMobile
          ? (kakaoRes.data?.nextRedirectMobileUrl || kakaoRes.data?.nextRedirectPcUrl)
          : kakaoRes.data?.nextRedirectPcUrl;

        if (redirectUrl) {
          if (isMobile) {
            markNavigatingToPayment();
            window.location.href = redirectUrl;
          } else {
            // 일반 예매는 결제 상태(paymentStatus)로 판정한다. 취소표와 달리
            // 실패·취소도 서버가 알려주므로 그대로 안내한다.
            const kakaoPaymentId = kakaoRes.data?.paymentId;
            await runKakaoPopupPayment(
              redirectUrl,
              async () => {
                if (!kakaoPaymentId) return { kind: 'PENDING' };
                const statusRes = await paymentApi.getPaymentStatus(kakaoPaymentId);
                const paymentStatus = statusRes.data?.paymentStatus;
                const bookingStatus = statusRes.data?.bookingStatus;

                // 서버는 결제 승인을 APPROVED로 알려준다(Payment.Status).
                // 'PAID'는 어떤 경로로도 오지 않아 판정에 쓰이지 않았다.
                if (paymentStatus === 'APPROVED' || bookingStatus === 'CONFIRMED') {
                  return {
                    kind: 'SUCCESS',
                    successUrl: `/payment/success?bookingId=${statusRes.data.bookingId}&paymentId=${kakaoPaymentId}`,
                  };
                }
                if (paymentStatus === 'CANCELLED') {
                  return { kind: 'FAILED', title: '결제 취소', message: '결제가 취소되었습니다.\n다시 시도해주세요.' };
                }
                if (paymentStatus === 'FAILED') {
                  return { kind: 'FAILED', title: '결제 실패', message: '결제 중 오류가 발생했습니다.\n다시 시도해주세요.' };
                }
                return { kind: 'PENDING' };
              },
              '일반',
            );
          }
        }
      }
    } catch (err) {
      console.error('Payment failed', err);

      // 서버 code가 있으면 그것부터 본다. 선점 만료와 결제 정보 없음은 둘 다
      // 404라 태그(NotFoundError)로는 나뉘지 않는데 사용자가 할 일은 다르다 —
      // 전자는 좌석부터 다시 골라야 하고 후자는 이 화면에서 재시도하면 된다
      // (services/be PaymentErrorCode).
      const code = toErrorCode(err);

      if (code === 'PAYMENT_HOLD_NOT_FOUND') {
        onError(
          '선점 시간 만료',
          '좌석 선점 시간이 만료되었습니다.\n좌석을 다시 선택해 주세요.',
        );
        setBookingStep('SEAT');
        setIsProcessing(false);
        return;
      }

      if (code === 'PAYMENT_ALREADY_PROCESSED') {
        // 이미 결제된 건이라 재시도는 의미가 없다. 결과를 확인하러 보낸다.
        onError(
          '이미 처리된 결제',
          '이미 결제가 완료된 예매입니다.\n마이페이지에서 예매 내역을 확인해 주세요.',
        );
        setIsProcessing(false);
        return;
      }

      switch (toFailureTag(err)) {
        case 'ValidationError':
          onError('요청 오류', '지원하지 않는 결제 수단이거나 잘못된 요청입니다.');
          break;
        case 'NotFoundError':
          onError('정보 없음', '예매 초안 또는 회차 정보를 찾을 수 없습니다.');
          break;
        case 'ConflictError':
          onError('상태 오류', '현재 예매 상태에서는 해당 결제 요청을 처리할 수 없습니다.');
          break;
        default:
          onError(
            '결제 오류',
            err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다.',
          );
      }

      setIsProcessing(false);
    }
  };

  const renderSummaryContent = () => (
    <div className="flex-1 lg:overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="bg-surface rounded-2xl border border-line">
        <div className="px-5 py-4 bg-surface-subtle border-b border-line rounded-t-2xl">
          <h3 className="font-extrabold text-[16px] text-content">좌석 정보</h3>
        </div>
        <div className="divide-y divide-line-subtle">
          {cancellationId ? (
            <div className="px-5 py-4 flex flex-col gap-1.5">
              <span className="font-bold text-content text-[15px]">취소표 1매</span>
              <span className="text-[13px] text-content-tertiary leading-none">배정된 취소표</span>
            </div>
          ) : Object.entries(priceGradeSeats).map(([priceGrade, seats]) => {
            const dotClass = priceGradeDotColors[priceGrade] || 'bg-surface-active';
            const counts = priceGradeTicketCounts[priceGrade] || {};
            const types = resolvePriceInfos(seats[0], optionsData);
            // 이전에는 권종 이름이 목록에 없으면 이 합계에서만 빠져, 같은 상황에서
            // 권종 선택 화면과 다른 금액이 나왔다. calculateGradeTotal이 두 화면의
            // 계산을 하나로 맞춘다.
            const priceGradeTotalPrice = calculateGradeTotal(types, counts);

            return (
              <div key={priceGrade} className="px-5 py-4 flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${dotClass}`} />
                    <span className="font-bold text-content text-[15px]">{priceGrade}석</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 ml-5 mt-0.5">
                    <span className="text-[13px] text-content-tertiary leading-none">{seats.map(s => s.seatLabel).join(', ')}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(counts).filter(([, c]) => c > 0).map(([typeId, count]) => {
                        return (
                          <span key={typeId} className="text-[11px] bg-primary-subtle text-primary font-medium px-2 py-0.5 rounded-md">
                            {typeId} {count as number}매
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <span className="font-extrabold text-content text-sm">
                  {priceGradeTotalPrice > 0 ? `${priceGradeTotalPrice.toLocaleString()}원` : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-line">
        <div className="px-5 py-4 bg-surface-subtle border-b border-line rounded-t-2xl">
          <h3 className="font-extrabold text-[16px] text-content">결제 금액</h3>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-content-secondary">티켓 금액</span>
            <span className="text-sm font-bold text-content">{ticketPrice.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-content-secondary">예매 수수료 (5%)</span>
            <span className="text-sm font-bold text-content">{bookingFee.toLocaleString()}원</span>
          </div>
          <div className="h-px bg-surface-active my-1" />
          <div className="flex justify-between items-center">
            <span className="text-base font-extrabold text-content">총 결제 금액</span>
            <span className="text-xl font-extrabold text-primary">{finalPrice.toLocaleString()}원</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBackButton = (containerClassName: string) => (
    <div className={`p-4 sm:p-6 bg-surface z-20 shrink-0 border-b border-line-subtle ${containerClassName}`}>
      <button
        onClick={() => {
          if (bookingStep === 'PAYMENT') {
            setBookingStep('TICKET_TYPE');
          } else {
            setBookingStep('PAYMENT');
          }
        }}
        disabled={isProcessing}
        className="px-4 py-2 text-content-secondary font-bold text-sm border border-line-strong rounded-xl hover:bg-surface-subtle:bg-surface-inverse transition-colors flex items-center gap-2 w-max"
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
            ? 'bg-primary text-white hover:bg-primary-hover active:scale-[0.98] shadow-lg shadow-blue-600/25'
            : 'bg-surface-active text-content-tertiary cursor-not-allowed'
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
          ? 'bg-danger text-white hover:bg-danger-hover active:scale-[0.98] shadow-lg shadow-red-500/25'
          : 'bg-surface-active text-content-tertiary cursor-not-allowed'
          }`}
        data-track-id="payment-confirm"
      >
        {isProcessing ? '처리 중...' : `${finalPrice.toLocaleString()}원 결제하기`}
      </button>
    );
  };

  return (
    <div className="absolute inset-0 top-[73px] flex flex-col lg:flex-row bg-surface-subtle z-40 animate-fade-in border-t border-line overflow-hidden">
      
      {/* 팝업 오버레이 */}
      {isKakaoPopupOpen && (
        <div className="absolute inset-0 z-50 bg-surface/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
          <h2 className="text-2xl font-extrabold text-content mb-3">결제 진행 중입니다</h2>
          <p className="text-content-tertiary text-center leading-relaxed">
            새 창에서 카카오페이 결제를 완료해 주세요.<br />
            결제가 완료되면 이 화면은 자동으로 넘어갑니다.
          </p>
          <button
            onClick={() => {
              // 폴링을 멈추면 팝업도 같이 닫힌다.
              cancelPollingRef.current?.();
              cancelPollingRef.current = null;
              setIsKakaoPopupOpen(false);
              setIsProcessing(false);
              onError('결제 취소', '결제가 강제로 취소되었습니다.\n결제 수단을 다시 선택해주세요.');
              setBookingStep('PAY_METHOD');
            }}
            className="mt-8 px-6 py-2.5 bg-surface-muted text-content-secondary rounded-xl font-bold hover:bg-surface-active:bg-surface-inverse transition-colors"
          >
            결제 창이 안 보이나요? (강제 취소 및 닫기)
          </button>
        </div>
      )}

      {/* Mobile-only Back Button */}
      {renderBackButton("lg:hidden")}

      {/* Mobile Top Summary (Visible only on mobile/tablet) */}
      <div className="lg:hidden w-full px-4 sm:px-6 pb-4 bg-surface z-30 shrink-0 border-b border-line-subtle">
        <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
          <div 
            className="flex items-center justify-between p-4 cursor-pointer transition-colors hover:bg-surface-subtle:bg-surface-inverse"
            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-content-secondary">총 결제 금액</span>
              <span className="font-extrabold text-primary text-lg">{finalPrice.toLocaleString()}원</span>
            </div>
            <button className="p-1 text-content-muted transition-transform duration-300">
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
                className="bg-surface-subtle border-t border-line-subtle"
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
      <div className="w-full lg:w-[60%] flex-1 flex flex-col relative overflow-hidden bg-surface lg:border-r border-line">
        
        {/* Desktop-only Back Button */}
        {renderBackButton("hidden lg:block")}

        <div className="flex-1 relative overflow-hidden bg-surface">
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
      <div className="hidden lg:flex lg:w-[40%] h-full flex-col bg-surface-subtle shrink-0 z-20">
        {renderSummaryContent()}
        <div className="p-6 shrink-0 border-t border-line bg-surface">
          {renderPaymentButton()}
        </div>
      </div>

      {/* Mobile Fixed Payment Button */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full p-4 sm:p-6 bg-surface border-t border-line z-40">
        {renderPaymentButton()}
      </div>

    </div>
  );
};
