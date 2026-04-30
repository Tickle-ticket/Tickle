package com.ssafy.tickle.payment.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.payment.config.PaymentConstants;
import com.ssafy.tickle.payment.domain.Payment;
import com.ssafy.tickle.payment.domain.PaymentErrorCode;
import com.ssafy.tickle.payment.infrastructure.persistence.PaymentRepository;
import com.ssafy.tickle.payment.presentation.dto.PaymentStatusResponse;
import com.ssafy.tickle.reservation.domain.BookingTicket;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.List;

/**
 * 결제 조회성 유스케이스를 처리합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentQueryService {

    private final PaymentRepository paymentRepository;
    private final BookingTicketRepository bookingTicketRepository;

    /**
     * 결제 상태를 조회합니다.
     *
     * <p>결제 단건 조회에 필요한 결제/티켓 정보를 모아 응답 DTO로 변환합니다.</p>
     *
     * @param paymentId 결제 식별자
     * @return 결제 상태 응답
     */
    public PaymentStatusResponse getPaymentStatus(Long paymentId) {
        Payment payment = getPayment(paymentId);
        // 좌석별 가격 요약을 함께 내려주기 위해 티켓 목록도 같이 조회한다.
        List<BookingTicket> tickets = bookingTicketRepository.findByBookingId(payment.getBooking().getId());
        return PaymentStatusResponse.from(payment, tickets, getDepositDeadline(payment));
    }

    /**
     * 결제 상태 조회 대상 결제를 조회합니다.
     *
     * @param paymentId 결제 식별자
     * @return 조회된 결제
     */
    private Payment getPayment(Long paymentId) {
        return paymentRepository.findDetailById(paymentId)
                .orElseThrow(() -> new BaseException(PaymentErrorCode.PAYMENT_NOT_FOUND));
    }

    /**
     * 무통장 입금 결제의 입금 마감 시각을 계산합니다.
     *
     * @param payment 결제 엔티티
     * @return 입금 마감 시각
     */
    private Instant getDepositDeadline(Payment payment) {
        ZonedDateTime createdAt = payment.getCreatedAt().atZone(PaymentConstants.PAYMENT_DEADLINE_ZONE_ID);
        return createdAt.plusDays(1)
                .with(PaymentConstants.BANK_TRANSFER_DEADLINE_TIME)
                .toInstant();
    }
}
