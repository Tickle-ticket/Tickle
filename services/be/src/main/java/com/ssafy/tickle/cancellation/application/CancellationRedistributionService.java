package com.ssafy.tickle.cancellation.application;

import com.ssafy.tickle.cancellation.domain.CancellationOffer;
import com.ssafy.tickle.cancellation.infrastructure.persistence.CancellationOfferRepository;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationOfferDetailResponse;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.payment.config.PaymentConstants;
import com.ssafy.tickle.payment.domain.Payment;
import com.ssafy.tickle.payment.domain.PaymentTransaction;
import com.ssafy.tickle.payment.infrastructure.persistence.PaymentRepository;
import com.ssafy.tickle.payment.infrastructure.persistence.PaymentTransactionRepository;
import com.ssafy.tickle.payment.presentation.dto.BankTransferPrepareResponse;
import com.ssafy.tickle.reservation.domain.Booking;
import com.ssafy.tickle.reservation.domain.BookingTicket;
import com.ssafy.tickle.reservation.domain.BookingTicketStatusHistory;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingRepository;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketRepository;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketStatusHistoryRepository;
import com.ssafy.tickle.seat.domain.SeatStatusChangedEvent;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationOfferDetailResponse;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 취소표 재배분 프로세스(상세 조회, 구매, SMS 발송)를 담당하는 서비스입니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CancellationRedistributionService {

    private final CancellationOfferRepository offerRepository;
    private final BookingRepository bookingRepository;
    private final BookingTicketRepository bookingTicketRepository;
    private final BookingTicketStatusHistoryRepository bookingTicketStatusHistoryRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final SessionSeatRepository sessionSeatRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final SmsNotificationService smsNotificationService;

    /**
     * 취소표 제안 상세 정보를 조회합니다.
     */
    public CancellationOfferDetailResponse getCancellationDetail(Long offerId, Long userId) {
        CancellationOffer offer = offerRepository.findByIdWithDetails(offerId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "제안을 찾을 수 없습니다."));

        validateOfferOwnershipAndTimer(offer, userId);

        SessionSeat seat = offer.getCancellationCandidate().getSessionSeat();
        BigDecimal ticketPrice = seat.getEventSeat().getEventPricePolicy().getPriceAmount();
        BigDecimal totalAmount = ticketPrice.add(calculateServiceFee(ticketPrice));

        return CancellationOfferDetailResponse.from(offer, totalAmount);
    }

    /**
     * 알림을 발송하고 1시간 타이머를 시작합니다.
     */
    @Transactional
    public void notifyCandidate(Long offerId) {
        CancellationOffer offer = offerRepository.findByIdWithDetails(offerId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "제안을 찾을 수 없습니다."));

        offer.startTimer(Instant.now());
        
        String phone = offer.getCancellationCandidate().getUser().getPhoneNumber();
        if (phone != null && !phone.isBlank()) {
            smsNotificationService.sendCancellationNotifyMessage(phone, offer.getId());
        } else {
            log.warn("사용자 전화번호가 없어 문자를 발송할 수 없습니다. (userId: {})", offer.getCancellationCandidate().getUser().getId());
        }
    }

    /**
     * 취소표 구매를 확정하고 무통장 입금 결제를 생성합니다.
     */
    @Transactional
    public BankTransferPrepareResponse purchaseCancellation(Long offerId, Long userId) {
        CancellationOffer offer = offerRepository.findByIdWithDetails(offerId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "제안을 찾을 수 없습니다."));

        validateOfferOwnershipAndTimer(offer, userId);

        // 1. 제안 수락
        offer.accept(Instant.now());

        SessionSeat seat = offer.getCancellationCandidate().getSessionSeat();
        
        // 가격 계산 로직 (기본가 적용)
        BigDecimal ticketPrice = seat.getEventSeat().getEventPricePolicy().getPriceAmount();
        BigDecimal fee = calculateServiceFee(ticketPrice);
        BigDecimal totalAmount = ticketPrice.add(fee);

        // 2. 예매(Booking) 생성
        Booking booking = bookingRepository.save(
                Booking.draft(
                        generateBookingNo(), 
                        offer.getCancellationCandidate().getUser(), 
                        seat.getSession(), 
                        totalAmount, 
                        1
                )
        );

        BookingTicket ticket = bookingTicketRepository.save(
                BookingTicket.draft(booking, seat, generateTicketNo(), ticketPrice, fee, totalAmount)
        );

        // 3. 결제(Payment) 생성 (무통장 입금)
        Payment payment = paymentRepository.save(
                Payment.pendingBankTransfer(
                        booking,
                        totalAmount,
                        PaymentConstants.CURRENCY_KRW,
                        PaymentConstants.BANK_TRANSFER_PROVIDER
                )
        );

        // 상태 전이
        booking.markPendingPayment();
        ticket.markPendingPayment();
        seat.markPendingPayment();

        paymentTransactionRepository.save(PaymentTransaction.pendingSale(payment, UUID.randomUUID().toString()));
        bookingTicketStatusHistoryRepository.save(
                BookingTicketStatusHistory.builder()
                        .bookingTicket(ticket)
                        .fromStatus(BookingTicket.Status.DRAFT.name())
                        .toStatus(BookingTicket.Status.PENDING_PAYMENT.name())
                        .build()
        );

        // WebSocket 동기화 (좌석 상태 PENDING_PAYMENT)
        eventPublisher.publishEvent(
                new SeatStatusChangedEvent(this, seat.getSession().getId(), List.of(seat.getId()), SessionSeat.SaleStatus.PENDING)
        );

        Instant deadline = getDepositDeadline(payment);
        return BankTransferPrepareResponse.from(payment, List.of(ticket), deadline);
    }

    private void validateOfferOwnershipAndTimer(CancellationOffer offer, Long userId) {
        if (!offer.getCancellationCandidate().getUser().getId().equals(userId)) {
            throw new BaseException(GlobalErrorCode.ACCESS_DENIED, "자신의 취소표만 구매할 수 있습니다.");
        }
        if (offer.getOfferStatus() != CancellationOffer.OfferStatus.UNACCEPTED) {
            throw new BaseException(GlobalErrorCode.CONFLICT, "유효한 취소표 구매 대기 상태가 아닙니다.");
        }
        if (Instant.now().isAfter(offer.getOfferExpiresAt())) {
            throw new BaseException(GlobalErrorCode.CONFLICT, "취소표 구매 가능 시간(1시간)이 초과되었습니다.");
        }
    }

    private BigDecimal calculateServiceFee(BigDecimal ticketPriceAmount) {
        return ticketPriceAmount.multiply(PaymentConstants.TICKET_SERVICE_FEE_RATE).setScale(0, RoundingMode.DOWN);
    }

    private String generateBookingNo() {
        return "BK-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    private String generateTicketNo() {
        return "TK-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    private Instant getDepositDeadline(Payment payment) {
        ZonedDateTime createdAt = payment.getCreatedAt().atZone(PaymentConstants.PAYMENT_DEADLINE_ZONE_ID);
        return createdAt.plusDays(1)
                .with(PaymentConstants.BANK_TRANSFER_DEADLINE_TIME)
                .toInstant();
    }
}
