package com.ssafy.tickle.payment.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.payment.config.PaymentConstants;
import com.ssafy.tickle.payment.domain.Payment;
import com.ssafy.tickle.payment.domain.PaymentErrorCode;
import com.ssafy.tickle.payment.domain.PaymentTransaction;
import com.ssafy.tickle.payment.infrastructure.persistence.PaymentRepository;
import com.ssafy.tickle.payment.infrastructure.persistence.PaymentTransactionRepository;
import com.ssafy.tickle.payment.presentation.dto.BankTransferPrepareRequest;
import com.ssafy.tickle.payment.presentation.dto.BankTransferPrepareResponse;
import com.ssafy.tickle.payment.presentation.dto.PaymentStatusResponse;
import com.ssafy.tickle.reservation.domain.Booking;
import com.ssafy.tickle.reservation.domain.BookingTicket;
import com.ssafy.tickle.reservation.domain.BookingTicketStatusHistory;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingRepository;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketRepository;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketStatusHistoryRepository;
import com.ssafy.tickle.seat.domain.SeatStatusChangedEvent;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.seat.infrastructure.redis.SeatHoldKeyStore;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * 결제 비즈니스 로직을 처리하는 서비스 클래스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentService {

    private final EventSessionRepository eventSessionRepository;
    private final UserRepository userRepository;
    private final SessionSeatRepository sessionSeatRepository;
    private final BookingRepository bookingRepository;
    private final BookingTicketRepository bookingTicketRepository;
    private final BookingTicketStatusHistoryRepository bookingTicketStatusHistoryRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final SeatHoldKeyStore seatHoldKeyStore;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 무통장 입금 결제를 확정하고 입금에 필요한 정보를 반환합니다.
     *
     * @param eventId 공연 식별자
     * @param scheduleId 회차 식별자
     * @param userId 사용자 식별자
     * @param request 무통장 입금 결제 확정 요청
     * @return 입금 안내 응답
     */
    @Transactional
    public BankTransferPrepareResponse confirmBankTransferPayment(
            Long eventId,
            Long scheduleId,
            Long userId,
            BankTransferPrepareRequest request
    ) {
        EventSession session = getSession(eventId, scheduleId);
        User user = getUser(userId);
        Booking booking = getBooking(request.bookingId());

        // 다른 사용자의 초안이나 다른 회차의 초안으로 결제를 시작하지 못하게 막는다.
        validateBookingOwnership(booking, user.getId(), session.getId());

        // 같은 예매 초안으로 이미 pending 결제가 있으면 새로 만들지 않고 재사용한다.
        return paymentRepository.findByBookingId(booking.getId())
                .filter(this::isReusablePendingBankTransfer)
                .map(payment -> {
                    List<BookingTicket> tickets = bookingTicketRepository.findByBookingId(payment.getBooking().getId());
                    return BankTransferPrepareResponse.from(payment, tickets, getDepositDeadline(payment));
                })
                .orElseGet(() -> createBankTransferPayment(booking));
    }

    /**
     * 결제를 시작할 예매 초안을 조회합니다.
     *
     * @param bookingId 예매 식별자
     * @return 조회된 예매 초안
     */
    private Booking getBooking(Long bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "예매 초안을 찾을 수 없습니다."));
    }

    /**
     * 결제를 요청한 사용자를 조회합니다.
     *
     * @param userId 사용자 식별자
     * @return 조회된 사용자
     */
    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BaseException(PaymentErrorCode.PAYMENT_USER_NOT_FOUND));
    }

    /**
     * 결제 상태를 조회합니다.
     *
     * @param paymentId 결제 식별자
     * @return 결제 상태 응답
     */
    public PaymentStatusResponse getPaymentStatus(Long paymentId) {
        Payment payment = getPayment(paymentId);
        List<BookingTicket> tickets = bookingTicketRepository.findByBookingId(payment.getBooking().getId());
        return PaymentStatusResponse.from(payment, tickets, getDepositDeadline(payment));
    }

    /**
     * DB에 저장된 pending 무통장 입금 결제 중 만료된 건을 정리합니다.
     *
     * @return 처리 건수
     */
    @Transactional
    public Integer expirePendingBankTransferPayments() {
        Integer expiredCount = 0;
        Long paymentIdCursor = 0L;
        Instant expiredPaymentCreatedBefore = getExpiredPaymentCreatedBefore(Instant.now());

        while (true) {
            // 하루 1회 배치여도 건수가 많을 수 있으니 ID 커서 기준으로 잘라 읽는다.
            List<Payment> payments = paymentRepository.findExpiredPendingBankTransferBatch(
                    Payment.Status.PENDING,
                    Payment.MethodType.BANK_TRANSFER,
                    Booking.Status.PENDING_PAYMENT,
                    expiredPaymentCreatedBefore,
                    paymentIdCursor,
                    PageRequest.of(0, PaymentConstants.BANK_TRANSFER_EXPIRE_BATCH_SIZE)
            );

            if (payments.isEmpty()) {
                break;
            }

            for (Payment payment : payments) {
                // 배치 후보를 뽑은 뒤에도 개별 건은 상세 상태를 다시 확인한 뒤 만료 처리한다.
                if (expirePendingBankTransferPayment(payment.getId())) {
                    expiredCount++;
                }
                paymentIdCursor = payment.getId();
            }
        }

        return expiredCount;
    }

    /**
     * 단건 무통장 입금 결제를 만료 처리합니다.
     *
     * @param paymentId 결제 식별자
     * @return 처리 여부
     */
    @Transactional
    public boolean expirePendingBankTransferPayment(Long paymentId) {
        Payment payment = findPendingPayment(paymentId).orElse(null);
        if (payment == null) {
            return false;
        }

        validateBankTransferPayment(payment);

        if (payment.getPaymentStatus() != Payment.Status.PENDING
                || payment.getBooking().getBookingStatus() != Booking.Status.PENDING_PAYMENT) {
            return false;
        }

        if (Instant.now().isBefore(getDepositDeadline(payment))) {
            return false;
        }

        // 만료 시점에는 결제, 예매, 티켓, 좌석 상태를 함께 되돌려야 한다.
        List<BookingTicket> tickets = bookingTicketRepository.findByBookingId(payment.getBooking().getId());
        List<SessionSeat> seats = tickets.stream()
                .map(BookingTicket::getSessionSeat)
                .sorted(Comparator.comparing(SessionSeat::getId))
                .toList();

        payment.cancel();
        payment.getBooking().expirePayment();
        tickets.forEach(BookingTicket::expire);
        seats.forEach(SessionSeat::expirePendingPayment);

        sessionSeatRepository.saveAll(seats);
        bookingTicketRepository.saveAll(tickets);
        bookingRepository.save(payment.getBooking());
        paymentRepository.save(payment);

        // 결제/티켓 상태 이력은 나중에 운영 이슈를 추적할 수 있게 별도로 남긴다.
        paymentTransactionRepository.save(
                PaymentTransaction.expiredCancel(payment, "DEPOSIT_DEADLINE_EXPIRED", "무통장 입금 마감 시간이 지났습니다.")
        );

        bookingTicketStatusHistoryRepository.saveAll(
                tickets.stream()
                        .map(ticket -> BookingTicketStatusHistory.builder()
                                .bookingTicket(ticket)
                                .fromStatus(BookingTicket.Status.PENDING_PAYMENT.name())
                                .toStatus(BookingTicket.Status.EXPIRED.name())
                                .build())
                        .toList()
        );

        // 변경 상태를 publish 합니다.
        publishSeatStatusChanged(
                payment.getBooking().getSession().getId(),
                seats,
                SessionSeat.SaleStatus.REALLOCATING
        );

        return true;
    }

    /**
     * 예매 초안을 기준으로 무통장 입금 결제를 확정하고 입금 안내 정보를 생성합니다.
     *
     * <p>이 메서드는 좌석 hold 유효성 검증, 예매/티켓/좌석 상태 전이,
     * 결제 및 상태 이력 저장, 좌석 상태 이벤트 발행까지 한 번에 처리합니다.</p>
     *
     * @param booking 결제를 시작할 예매 초안
     * @return 입금 안내 응답
     */
    private BankTransferPrepareResponse createBankTransferPayment(Booking booking) {
        List<BookingTicket> tickets = bookingTicketRepository.findByBookingId(booking.getId());
        List<Long> seatIds = tickets.stream()
                .map(ticket -> ticket.getSessionSeat().getId())
                .sorted()
                .toList();

        // 무통장 입금 확정 시점에도 Redis hold가 살아 있는지 먼저 확인한다.
        validateHeldSeatsInRedis(booking.getSession().getId(), booking.getUser().getId(), seatIds);

        // Redis hold가 아직 유효한 좌석만 다시 DB에서 선점 상태로 확인한다.
        List<SessionSeat> heldSeats = sessionSeatRepository.findAllBySessionIdAndHeldByUserIdAndSaleStatusAndIdIn(
                booking.getSession().getId(),
                booking.getUser().getId(),
                SessionSeat.SaleStatus.HELD,
                seatIds
        );

        if (heldSeats.size() != seatIds.size()) {
            throw new BaseException(PaymentErrorCode.PAYMENT_HOLD_NOT_FOUND);
        }

        // 무통장 입금이 확정되면 예매는 입금 대기 상태로 전환한다.
        booking.markPendingPayment();
        bookingRepository.save(booking);

        // 결제 엔티티는 예매 총 결제 금액 기준으로 하나만 만든다.
        Payment payment = paymentRepository.save(
                Payment.pendingBankTransfer(
                        booking,
                        booking.getTotalPaymentAmount(),
                        PaymentConstants.CURRENCY_KRW,
                        PaymentConstants.BANK_TRANSFER_PROVIDER
                )
        );

        // 티켓과 좌석도 입금 대기 상태에 맞춰 함께 전이시킨다.
        tickets.forEach(BookingTicket::markPendingPayment);
        heldSeats.forEach(SessionSeat::markPendingPayment);
        bookingTicketRepository.saveAll(tickets);
        sessionSeatRepository.saveAll(heldSeats);
        paymentTransactionRepository.save(PaymentTransaction.pendingSale(payment, UUID.randomUUID().toString()));

        // 초안 티켓의 상태 변경 이력을 남긴다.
        bookingTicketStatusHistoryRepository.saveAll(
                tickets.stream()
                        .map(ticket -> BookingTicketStatusHistory.builder()
                                .bookingTicket(ticket)
                                .fromStatus(BookingTicket.Status.DRAFT.name())
                                .toStatus(BookingTicket.Status.PENDING_PAYMENT.name())
                                .build())
                        .toList()
        );

        // 무통장 입금 확정이 끝나면 좌석 hold 키만 제거하고, 이후 만료는 하루 1회 DB 배치가 정리한다.
        Instant deadline = getDepositDeadline(payment);
        seatHoldKeyStore.deleteHeld(booking.getSession().getId(), booking.getUser().getId());
        publishSeatStatusChanged(booking.getSession().getId(), heldSeats, SessionSeat.SaleStatus.PENDING);

        return BankTransferPrepareResponse.from(payment, tickets, deadline);
    }

    /**
     * Redis에 저장된 좌석 hold 정보가 현재 결제 요청 좌석과 정확히 일치하는지 검증합니다.
     *
     * @param sessionId 회차 식별자
     * @param userId 사용자 식별자
     * @param seatIds 결제를 진행할 좌석 식별자 목록
     */
    private void validateHeldSeatsInRedis(Long sessionId, Long userId, List<Long> seatIds) {
        // Redis에는 사용자가 실제로 hold한 좌석 집합이 들어 있어야 한다.
        List<Long> heldSeatIds = seatHoldKeyStore.getHeldSeatIds(sessionId, userId);
        Set<Long> heldSeatSet = new LinkedHashSet<>(heldSeatIds);
        Set<Long> requestedSeatSet = new LinkedHashSet<>(seatIds);
        if (heldSeatIds.isEmpty() || !heldSeatSet.equals(requestedSeatSet)) {
            throw new BaseException(PaymentErrorCode.PAYMENT_HOLD_NOT_FOUND);
        }
    }

    /**
     * 무통장 입금 전용 결제인지 검증합니다.
     *
     * @param payment 검증 대상 결제
     */
    private void validateBankTransferPayment(Payment payment) {
        if (payment.getPaymentMethodType() != Payment.MethodType.BANK_TRANSFER
                || !PaymentConstants.BANK_TRANSFER_PROVIDER.equals(payment.getProviderName())) {
            throw new BaseException(PaymentErrorCode.PAYMENT_INVALID_STATE);
        }
    }

    /**
     * 기존 pending 무통장 결제를 그대로 재사용할 수 있는지 확인합니다.
     *
     * @param payment 검증 대상 결제
     * @return 재사용 가능 여부
     */
    private boolean isReusablePendingBankTransfer(Payment payment) {
        return payment.getPaymentMethodType() == Payment.MethodType.BANK_TRANSFER
                && PaymentConstants.BANK_TRANSFER_PROVIDER.equals(payment.getProviderName())
                && payment.getPaymentStatus() == Payment.Status.PENDING
                && payment.getBooking().getBookingStatus() == Booking.Status.PENDING_PAYMENT;
    }

    /**
     * 결제 상태 조회 대상 결제를 조회합니다.
     *
     * @param paymentId 결제 식별자
     * @return 조회된 결제
     */
    private Payment getPayment(Long paymentId) {
        return findPendingPayment(paymentId)
                .orElseThrow(() -> new BaseException(PaymentErrorCode.PAYMENT_NOT_FOUND));
    }

    /**
     * 예매와 사용자, 회차 정보를 함께 가진 결제를 조회합니다.
     *
     * @param paymentId 결제 식별자
     * @return 조회 결과
     */
    private java.util.Optional<Payment> findPendingPayment(Long paymentId) {
        return paymentRepository.findDetailById(paymentId);
    }

    /**
     * 무통장 입금 확정 대상 회차를 조회합니다.
     *
     * @param eventId 공연 식별자
     * @param scheduleId 회차 식별자
     * @return 조회된 회차
     */
    private EventSession getSession(Long eventId, Long scheduleId) {
        return eventSessionRepository.findByIdAndEventId(scheduleId, eventId)
                .orElseThrow(() -> new BaseException(PaymentErrorCode.PAYMENT_HOLD_NOT_FOUND));
    }

    /**
     * 무통장 입금 확정 대상 예매 초안이 현재 사용자와 회차에 속한 초안인지 검증합니다.
     *
     * @param booking 검증 대상 예매
     * @param userId 사용자 식별자
     * @param sessionId 회차 식별자
     */
    private void validateBookingOwnership(Booking booking, Long userId, Long sessionId) {
        if (!booking.getUser().getId().equals(userId) || !booking.getSession().getId().equals(sessionId)) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "예매 초안과 사용자/회차 정보가 일치하지 않습니다.");
        }
        // 무통장 입금 확정은 DRAFT 초안이나 기존 PENDING_PAYMENT 재조회에만 허용한다.
        if (booking.getBookingStatus() != Booking.Status.DRAFT
                && booking.getBookingStatus() != Booking.Status.PENDING_PAYMENT) {
            throw new BaseException(PaymentErrorCode.PAYMENT_INVALID_STATE);
        }
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

    /**
     * 하루 1회 배치 시점에 이미 만료되어 있어야 하는 결제의 생성 시각 상한을 계산합니다.
     *
     * @param now 기준 시각
     * @return 만료 대상 결제 생성 시각 상한
     */
    private Instant getExpiredPaymentCreatedBefore(Instant now) {
        ZonedDateTime zonedNow = now.atZone(PaymentConstants.PAYMENT_DEADLINE_ZONE_ID);
        return zonedNow.toLocalDate()
                .minusDays(1)
                .atStartOfDay(PaymentConstants.PAYMENT_DEADLINE_ZONE_ID)
                .toInstant();
    }

    /**
     * 좌석 상태 변경 이벤트를 발행합니다.
     *
     * @param scheduleId 회차 식별자
     * @param seats 상태가 바뀐 좌석 목록
     * @param saleStatus 변경 후 좌석 판매 상태
     */
    private void publishSeatStatusChanged(
            Long scheduleId,
            List<SessionSeat> seats,
            SessionSeat.SaleStatus saleStatus
    ) {
        eventPublisher.publishEvent(
                new SeatStatusChangedEvent(
                        this,
                        scheduleId,
                        seats.stream().map(SessionSeat::getId).toList(),
                        saleStatus
                )
        );
    }
}
