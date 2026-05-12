package com.ssafy.tickle.payment.application;

import com.ssafy.tickle.cancellation.domain.CancellationCandidate;
import com.ssafy.tickle.cancellation.domain.CancellationErrorCode;
import com.ssafy.tickle.cancellation.domain.CancellationOffer;
import com.ssafy.tickle.cancellation.infrastructure.persistence.CancellationCandidateRepository;
import com.ssafy.tickle.cancellation.infrastructure.persistence.CancellationOfferRepository;
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
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * 결제 상태를 변경하는 명령성 유스케이스를 처리합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BankTransferPaymentService {

    private static final int MAX_BOOKING_AND_WAITING_COUNT = 4;
    private static final List<BookingTicket.Status> OWNED_TICKET_STATUSES = List.of(
            BookingTicket.Status.PENDING_PAYMENT,
            BookingTicket.Status.BOOKED
    );

    private final EventSessionRepository eventSessionRepository;
    private final UserRepository userRepository;
    private final SessionSeatRepository sessionSeatRepository;
    private final BookingRepository bookingRepository;
    private final BookingTicketRepository bookingTicketRepository;
    private final BookingTicketStatusHistoryRepository bookingTicketStatusHistoryRepository;
    private final CancellationCandidateRepository cancellationCandidateRepository;
    private final CancellationOfferRepository cancellationOfferRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;

    private final SeatHoldKeyStore seatHoldKeyStore;

    private final ApplicationEventPublisher eventPublisher;

    /**
     * 무통장 입금 결제를 확정하고 입금에 필요한 정보를 반환합니다.
     *
     * <p>이 메서드는 예매 초안 소유권 검증, 기존 pending 결제 재사용 여부 확인,
     * 신규 pending 결제 생성까지 무통장 입금 확정 진입점 전체를 담당합니다.</p>
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

        // 다른 사용자의 초안이나 다른 회차의 초안은 결제 대상으로 사용할 수 없다.
        validateBookingOwnership(booking, user.getId(), session.getId());

        // 같은 초안으로 이미 만들어진 pending 무통장 결제가 있으면 그대로 재응답한다.
        return paymentRepository.findByBookingId(booking.getId())
                .filter(this::isReusablePendingBankTransfer)
                .map(payment -> {
                    List<BookingTicket> tickets = bookingTicketRepository.findByBookingId(payment.getBooking().getId());
                    return BankTransferPrepareResponse.from(payment, tickets, getDepositDeadline(payment));
                })
                .orElseGet(() -> createBankTransferPayment(booking));
    }

    /**
     * 단건 무통장 입금 결제를 만료 처리합니다.
     *
     * <p>결제, 예매, 티켓, 좌석의 상태를 함께 전이시키고,
     * 운영 추적을 위한 결제/티켓 상태 이력도 남깁니다.</p>
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

        // 이미 다른 상태로 전이된 결제는 만료 배치가 다시 건드리지 않는다.
        if (payment.getPaymentStatus() != Payment.Status.PENDING
                || payment.getBooking().getBookingStatus() != Booking.Status.PENDING_PAYMENT) {
            return false;
        }

        // 단건 만료 진입이어도 실제 입금 마감 시각이 지났는지 다시 확인한다.
        if (Instant.now().isBefore(getDepositDeadline(payment))) {
            return false;
        }

        // 만료 시점에는 결제, 예매, 티켓, 좌석 상태를 함께 되돌려야 한다.
        List<BookingTicket> tickets = bookingTicketRepository.findByBookingId(payment.getBooking().getId());
        List<SessionSeat> seats = tickets.stream()
                .map(BookingTicket::getSessionSeat)
                .sorted(Comparator.comparing(SessionSeat::getId))
                .toList();

        processExpirePendingPaymentTransition(payment, tickets, seats);

        // 입금 만료 좌석은 일반 판매 복귀가 아니라 재배정 시작 상태로 publish 한다.
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
     * <p>좌석 hold 유효성 검증, 예매/티켓/좌석 상태 전이,
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

        // 결제 진입 직전에도 취소표 WAITING/OFFERED 점유와 합산해 4매 제한을 다시 확인합니다.
        CancellationOffer cancellationOffer = findCancellationOffer(booking);
        validateBookingAndWaitingLimit(booking, tickets.size(), cancellationOffer);

        // 결제 확정 시점에도 Redis hold 키가 아직 살아 있는지 먼저 확인한다.
        validateHeldSeatsInRedis(booking.getSession().getId(), booking.getUser().getId(), seatIds);

        // Redis hold가 살아 있어도 DB 좌석이 실제 HELD 상태인지 다시 검증한다.
        List<SessionSeat> heldSeats = sessionSeatRepository.findAllBySessionIdAndHeldByUserIdAndSaleStatusAndIdIn(
                booking.getSession().getId(),
                booking.getUser().getId(),
                SessionSeat.SaleStatus.HELD,
                seatIds
        );

        if (heldSeats.size() != seatIds.size()) {
            throw new BaseException(PaymentErrorCode.PAYMENT_HOLD_NOT_FOUND);
        }

        // 결제 엔티티는 예매 총 결제 금액 기준으로 하나만 만든다.
        Payment payment = paymentRepository.save(
                Payment.pendingBankTransfer(
                        booking,
                        booking.getTotalPaymentAmount(),
                        PaymentConstants.CURRENCY_KRW,
                        PaymentConstants.BANK_TRANSFER_PROVIDER
                )
        );

        processPendingPaymentTransition(booking, payment, tickets, heldSeats, cancellationOffer);

        // 결제 준비가 끝나면 좌석 hold 키는 제거하고, 좌석 상태는 PENDING으로 publish 한다.
        Instant deadline = getDepositDeadline(payment);
        seatHoldKeyStore.deleteHeld(booking.getSession().getId(), booking.getUser().getId());
        publishSeatStatusChanged(booking.getSession().getId(), heldSeats, SessionSeat.SaleStatus.PENDING);

        return BankTransferPrepareResponse.from(payment, tickets, deadline);
    }

    /**
     * 예매 초안, 티켓, 좌석을 입금 대기 상태로 전이하고 관련 이력을 저장합니다.
     *
     * @param booking 상위 예매
     * @param payment 생성된 결제
     * @param tickets 전이할 티켓 목록
     * @param heldSeats 전이할 좌석 목록
     */
    private void processPendingPaymentTransition(
            Booking booking,
            Payment payment,
            List<BookingTicket> tickets,
            List<SessionSeat> heldSeats,
            CancellationOffer cancellationOffer
    ) {
        // 무통장 입금 수단이 확정되면 예매는 입금 대기 상태가 된다.
        booking.markPendingPayment();
        bookingRepository.save(booking);
        markCancellationCandidatePurchasedIfNeeded(cancellationOffer);

        // 티켓과 좌석도 결제 준비 상태에 맞춰 함께 전이시킨다.
        tickets.forEach(BookingTicket::markPendingPayment);
        heldSeats.forEach(SessionSeat::markPendingPayment);
        bookingTicketRepository.saveAll(tickets);
        sessionSeatRepository.saveAll(heldSeats);

        // 결제 생성 이력과 티켓 상태 변경 이력을 함께 남긴다.
        paymentTransactionRepository.save(PaymentTransaction.pendingSale(payment, UUID.randomUUID().toString()));
        bookingTicketStatusHistoryRepository.saveAll(
                tickets.stream()
                        .map(ticket -> BookingTicketStatusHistory.builder()
                                .bookingTicket(ticket)
                                .fromStatus(BookingTicket.Status.DRAFT.name())
                                .toStatus(BookingTicket.Status.PENDING_PAYMENT.name())
                                .build())
                        .toList()
        );
    }

    /**
     * 취소표 예매이면 연결된 취소표 제안을 조회합니다.
     *
     * @param booking 결제 대상 예매
     * @return 취소표 제안, 일반 예매이면 null
     */
    private CancellationOffer findCancellationOffer(Booking booking) {
        if (!booking.isCancellationBooking()) {
            return null;
        }

        return cancellationOfferRepository.findByIdWithDetails(booking.getCancellationOfferId())
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "취소표 제안을 찾을 수 없습니다."));
    }

    /**
     * 취소표 무통장 입금 대기 진입 시 후보를 구매 완료 점유 상태로 전환합니다.
     *
     * @param cancellationOffer 취소표 제안, 일반 예매이면 null
     */
    private void markCancellationCandidatePurchasedIfNeeded(CancellationOffer cancellationOffer) {
        if (cancellationOffer == null) {
            return;
        }
        cancellationOffer.getCancellationCandidate().purchase(Instant.now());
    }

    private void validateBookingAndWaitingLimit(Booking booking, int newTicketCount) {
        long ownedTicketCount = bookingTicketRepository.countByUserIdAndSessionIdAndTicketStatusIn(
                booking.getUser().getId(),
                booking.getSession().getId(),
                OWNED_TICKET_STATUSES
        );
        long activeCandidateCount = cancellationCandidateRepository.countByUserIdAndSessionIdAndStatuses(
                booking.getUser().getId(),
                booking.getSession().getId(),
                List.of(CancellationCandidate.Status.WAITING, CancellationCandidate.Status.OFFERED)
        );

        if (ownedTicketCount + activeCandidateCount + newTicketCount > MAX_BOOKING_AND_WAITING_COUNT) {
            throw new BaseException(CancellationErrorCode.CANDIDATE_LIMIT_EXCEEDED);
        }
    }

    /**
     * 취소표 예매의 결제 진입 수량 제한을 검증합니다.
     *
     * <p>현재 결제 중인 취소표 후보는 이미 OFFERED 상태로 점유 중이므로
     * 중복 카운트하지 않도록 제외한 뒤 새 티켓 수량을 합산합니다.</p>
     *
     * @param booking 예매 초안
     * @param newTicketCount 결제 진입 티켓 수
     * @param cancellationOffer 취소표 제안, 일반 예매이면 null
     */
    private void validateBookingAndWaitingLimit(
            Booking booking,
            int newTicketCount,
            CancellationOffer cancellationOffer
    ) {
        if (cancellationOffer == null) {
            validateBookingAndWaitingLimit(booking, newTicketCount);
            return;
        }

        long ownedTicketCount = bookingTicketRepository.countByUserIdAndSessionIdAndTicketStatusIn(
                booking.getUser().getId(),
                booking.getSession().getId(),
                OWNED_TICKET_STATUSES
        );
        long activeCandidateCount = cancellationCandidateRepository.countByUserIdAndSessionIdAndIdNotAndStatuses(
                booking.getUser().getId(),
                booking.getSession().getId(),
                cancellationOffer.getCancellationCandidate().getId(),
                List.of(CancellationCandidate.Status.WAITING, CancellationCandidate.Status.OFFERED)
        );

        if (ownedTicketCount + activeCandidateCount + newTicketCount > MAX_BOOKING_AND_WAITING_COUNT) {
            throw new BaseException(CancellationErrorCode.CANDIDATE_LIMIT_EXCEEDED);
        }
    }

    /**
     * pending 무통장 입금 결제를 만료 상태로 전이하고 관련 이력을 저장합니다.
     *
     * @param payment 만료할 결제
     * @param tickets 만료할 티켓 목록
     * @param seats 만료할 좌석 목록
     */
    private void processExpirePendingPaymentTransition(
            Payment payment,
            List<BookingTicket> tickets,
            List<SessionSeat> seats
    ) {
        payment.cancel();
        payment.getBooking().expirePayment();
        expireCancellationOfferIfNeeded(payment.getBooking());
        tickets.forEach(BookingTicket::expire);
        seats.forEach(SessionSeat::expirePendingPayment);

        sessionSeatRepository.saveAll(seats);
        bookingTicketRepository.saveAll(tickets);
        bookingRepository.save(payment.getBooking());
        paymentRepository.save(payment);

        // 운영에서 만료 사유를 추적할 수 있도록 결제 이력과 티켓 상태 이력을 남긴다.
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
    }

    /**
     * 취소표 무통장 입금 대기 예매가 만료되면 연결된 제안을 만료 처리합니다.
     *
     * <p>제안을 닫아야 이후 REALLOCATING 좌석 재배분이 ACCEPTED offer에 막히지 않습니다.
     * 예매와 티켓은 삭제하지 않고 PAYMENT_EXPIRED/EXPIRED 상태 이력으로 남깁니다.</p>
     *
     * @param booking 만료 처리된 예매
     */
    private void expireCancellationOfferIfNeeded(Booking booking) {
        CancellationOffer offer = findCancellationOffer(booking);
        if (offer == null || offer.getOfferStatus() != CancellationOffer.OfferStatus.ACCEPTED) {
            return;
        }
        offer.expire(Instant.now());
    }

    /**
     * Redis에 저장된 좌석 hold 정보가 현재 결제 요청 좌석과 정확히 일치하는지 검증합니다.
     *
     * @param sessionId 회차 식별자
     * @param userId 사용자 식별자
     * @param seatIds 결제를 진행할 좌석 식별자 목록
     */
    private void validateHeldSeatsInRedis(Long sessionId, Long userId, List<Long> seatIds) {
        List<Long> heldSeatIds = seatHoldKeyStore.getHeldSeatIds(sessionId, userId);
        Set<Long> heldSeatSet = new LinkedHashSet<>(heldSeatIds);
        Set<Long> requestedSeatSet = new LinkedHashSet<>(seatIds);
        // 좌석 집합이 정확히 같아야 같은 hold를 기반으로 결제를 이어갈 수 있다.
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
     * <p>같은 예매 초안에서 중복 요청이 들어와도 새 결제를 만들지 않도록
     * 멱등성에 가까운 재사용 조건을 제공합니다.</p>
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
     * 예매와 사용자, 회차 정보를 함께 가진 결제를 조회합니다.
     *
     * @param paymentId 결제 식별자
     * @return 조회 결과
     */
    private java.util.Optional<Payment> findPendingPayment(Long paymentId) {
        return paymentRepository.findDetailById(paymentId);
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
        // 무통장 입금 확정은 초안 생성 직후나 기존 입금 대기 재조회에만 허용한다.
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
