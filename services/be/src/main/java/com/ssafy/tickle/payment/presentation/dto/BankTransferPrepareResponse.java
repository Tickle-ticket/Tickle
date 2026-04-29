package com.ssafy.tickle.payment.presentation.dto;

import com.ssafy.tickle.payment.config.PaymentConstants;
import com.ssafy.tickle.payment.domain.Payment;
import com.ssafy.tickle.reservation.domain.Booking;
import com.ssafy.tickle.reservation.domain.BookingTicket;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * 무통장 입금 확정 후 입금 안내 응답 DTO입니다.
 *
 * @param paymentId 결제 식별자
 * @param bookingId 예매 식별자
 * @param bookingNo 예매 번호
 * @param paymentStatus 결제 상태
 * @param bookingStatus 예매 상태
 * @param orderAmount 총 주문 금액. 좌석별 티켓 가격 합계에 수수료 합계를 더한 값이다.
 * @param currencyCode 통화 코드
 * @param bankAccount 입금 계좌번호
 * @param accountHolder 예금주
 * @param depositDeadline 입금 마감 시각
 * @param seats 결제 대상 좌석 요약. 각 좌석은 티켓 가격, 수수료, 최종 결제 금액을 함께 반환한다.
 */
public record BankTransferPrepareResponse(
        Long paymentId,
        Long bookingId,
        String bookingNo,
        Payment.Status paymentStatus,
        Booking.Status bookingStatus,
        BigDecimal orderAmount,
        String currencyCode,
        String bankAccount,
        String accountHolder,
        Instant depositDeadline,
        List<PaymentSeatSummaryResponse> seats
) {
    /**
     * 무통장 입금 확정 후 입금 안내 응답을 생성합니다.
     *
     * @param payment 결제 정보
     * @param tickets 결제 대상 티켓
     * @param depositDeadline 입금 마감 시각
     * @return 입금 안내 응답
     */
    public static BankTransferPrepareResponse from(
            Payment payment,
            List<BookingTicket> tickets,
            Instant depositDeadline
    ) {
        return new BankTransferPrepareResponse(
                payment.getId(),
                payment.getBooking().getId(),
                payment.getBooking().getBookingNo(),
                payment.getPaymentStatus(),
                payment.getBooking().getBookingStatus(),
                payment.getOrderAmount(),
                payment.getCurrencyCode(),
                PaymentConstants.BANK_TRANSFER_ACCOUNT,
                PaymentConstants.BANK_TRANSFER_ACCOUNT_HOLDER,
                depositDeadline,
                tickets.stream().map(PaymentSeatSummaryResponse::from).toList()
        );
    }
}
