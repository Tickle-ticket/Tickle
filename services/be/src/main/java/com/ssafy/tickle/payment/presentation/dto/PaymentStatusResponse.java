package com.ssafy.tickle.payment.presentation.dto;

import com.ssafy.tickle.payment.config.PaymentConstants;
import com.ssafy.tickle.payment.domain.Payment;
import com.ssafy.tickle.reservation.domain.Booking;
import com.ssafy.tickle.reservation.domain.BookingTicket;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * 결제 상태 조회 응답 DTO입니다.
 *
 * @param paymentId 결제 식별자
 * @param bookingId 예매 식별자
 * @param bookingNo 예매 번호
 * @param paymentMethodType 결제 수단
 * @param paymentStatus 결제 상태
 * @param bookingStatus 예매 상태
 * @param orderAmount 주문 금액. 좌석별 티켓 가격 합계와 수수료 합계를 합산한 최종 결제 금액이다.
 * @param currencyCode 통화 코드
 * @param depositDeadline 입금 마감 시각
 * @param bankAccount 입금 계좌번호
 * @param accountHolder 예금주
 * @param seats 결제 좌석 목록. 각 좌석마다 티켓 가격과 수수료를 분리해서 내려준다.
 */
public record PaymentStatusResponse(
        Long paymentId,
        Long bookingId,
        String bookingNo,
        Payment.MethodType paymentMethodType,
        Payment.Status paymentStatus,
        Booking.Status bookingStatus,
        BigDecimal orderAmount,
        String currencyCode,
        Instant depositDeadline,
        String bankAccount,
        String accountHolder,
        List<PaymentSeatSummaryResponse> seats
) {
    /**
     * 결제 상태 조회 응답을 생성합니다.
     *
     * @param payment 결제 정보
     * @param tickets 결제 대상 티켓
     * @param depositDeadline 입금 마감 시각
     * @return 결제 상태 응답
     */
    public static PaymentStatusResponse from(
            Payment payment,
            List<BookingTicket> tickets,
            Instant depositDeadline
    ) {
        return new PaymentStatusResponse(
                payment.getId(),
                payment.getBooking().getId(),
                payment.getBooking().getBookingNo(),
                payment.getPaymentMethodType(),
                payment.getPaymentStatus(),
                payment.getBooking().getBookingStatus(),
                payment.getOrderAmount(),
                payment.getCurrencyCode(),
                depositDeadline,
                PaymentConstants.BANK_TRANSFER_ACCOUNT,
                PaymentConstants.BANK_TRANSFER_ACCOUNT_HOLDER,
                tickets.stream().map(PaymentSeatSummaryResponse::from).toList()
        );
    }
}
