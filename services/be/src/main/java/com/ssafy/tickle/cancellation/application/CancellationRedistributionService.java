package com.ssafy.tickle.cancellation.application;

import com.ssafy.tickle.cancellation.domain.CancellationCandidate;
import com.ssafy.tickle.cancellation.domain.CancellationOffer;
import com.ssafy.tickle.cancellation.infrastructure.persistence.CancellationCandidateRepository;
import com.ssafy.tickle.cancellation.infrastructure.persistence.CancellationOfferRepository;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationOfferDetailResponse;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationPurchaseRequest;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationPurchaseResponse;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.payment.application.KakaoPayPaymentService;
import com.ssafy.tickle.payment.config.PaymentConstants;
import com.ssafy.tickle.payment.domain.Payment;
import com.ssafy.tickle.payment.domain.PaymentTransaction;
import com.ssafy.tickle.payment.infrastructure.persistence.PaymentRepository;
import com.ssafy.tickle.payment.infrastructure.persistence.PaymentTransactionRepository;
import com.ssafy.tickle.payment.presentation.dto.KakaoPayReadyRequest;
import com.ssafy.tickle.payment.presentation.dto.KakaoPayReadyResponse;
import com.ssafy.tickle.cancellation.infrastructure.persistence.CancellationCandidateRepository;
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
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
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
    private final KakaoPayPaymentService kakaoPayPaymentService;
    private final CancellationCandidateRepository candidateRepository;

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
     * 취소표 구매를 확정하고 결제를 생성합니다. (무통장 입금 또는 카카오페이)
     */
    @Transactional
    public CancellationPurchaseResponse purchaseCancellation(Long offerId, Long userId,
            CancellationPurchaseRequest request) {
        CancellationOffer offer = offerRepository.findByIdWithDetails(offerId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "제안을 찾을 수 없습니다."));

        validateOfferOwnershipAndTimer(offer, userId);

        // 1. 제안 수락
        offer.accept(Instant.now());

        SessionSeat seat = offer.getCancellationCandidate().getSessionSeat();
        
        // 좌석 상태 변경 (REALLOCATING -> HELD)
        // 기존 결제 로직을 재사용하기 위해 HELD 상태로 선점한다.
        seat.holdForCancellation(userId);
        sessionSeatRepository.save(seat);

        // 가격 계산 로직 (기본가 적용)
        BigDecimal ticketPrice = seat.getEventSeat().getEventPricePolicy().getPriceAmount();
        BigDecimal fee = calculateServiceFee(ticketPrice);
        BigDecimal totalAmount = ticketPrice.add(fee);

        // 2. 예매(Booking) 생성 (Draft 상태)
        Booking booking = bookingRepository.save(
                Booking.draftForCancellation(
                        generateBookingNo(),
                        offer.getCancellationCandidate().getUser(),
                        seat.getSession(),
                        totalAmount,
                        1,
                        offer.getId()
                )
        );

        BookingTicket ticket = bookingTicketRepository.save(
                BookingTicket.draft(booking, seat, generateTicketNo(), ticketPrice, fee, totalAmount));

        // 3. 결제 수단별 처리
        if (request.paymentMethod() == Payment.MethodType.KAKAOPAY) {
            // 카카오페이 준비
            KakaoPayReadyResponse kakaoResponse = kakaoPayPaymentService.readyKakaoPay(
                    seat.getSession().getEvent().getId(),
                    seat.getSession().getId(),
                    userId,
                    new KakaoPayReadyRequest(booking.getId()));

            // 상태 전이 (READY)
            booking.markPendingPayment();
            ticket.markPendingPayment();
            seat.markPendingPayment();

            // WebSocket 동기화
            eventPublisher.publishEvent(
                    new SeatStatusChangedEvent(this, seat.getSession().getId(), List.of(seat.getId()),
                            SessionSeat.SaleStatus.PENDING));

            return CancellationPurchaseResponse.forKakaoPay(
                    booking.getId(),
                    booking.getBookingNo(),
                    totalAmount,
                    PaymentConstants.CURRENCY_KRW,
                    kakaoResponse.nextRedirectPcUrl());
        } else {
            // 무통장 입금 처리
            Payment payment = paymentRepository.save(
                    Payment.pendingBankTransfer(
                            booking,
                            totalAmount,
                            PaymentConstants.CURRENCY_KRW,
                            PaymentConstants.BANK_TRANSFER_PROVIDER));

            // 상태 전이 (PENDING_PAYMENT)
            booking.markPendingPayment();
            ticket.markPendingPayment();
            seat.markPendingPayment();

            paymentTransactionRepository.save(PaymentTransaction.pendingSale(payment, UUID.randomUUID().toString()));
            bookingTicketStatusHistoryRepository.save(
                    BookingTicketStatusHistory.builder()
                            .bookingTicket(ticket)
                            .fromStatus(BookingTicket.Status.DRAFT.name())
                            .toStatus(BookingTicket.Status.PENDING_PAYMENT.name())
                            .build());

            // WebSocket 동기화
            eventPublisher.publishEvent(
                    new SeatStatusChangedEvent(this, seat.getSession().getId(), List.of(seat.getId()),
                            SessionSeat.SaleStatus.PENDING));

            Instant deadline = getDepositDeadline(payment);
            return CancellationPurchaseResponse.forBankTransfer(
                    booking.getId(),
                    booking.getBookingNo(),
                    totalAmount,
                    PaymentConstants.CURRENCY_KRW,
                    PaymentConstants.BANK_TRANSFER_ACCOUNT,
                    PaymentConstants.BANK_TRANSFER_ACCOUNT_HOLDER,
                    deadline);
        }
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

    /**
     * 취소표 제안을 거절(양보)하고 즉시 다음 순번으로 넘깁니다.
     */
    @Transactional
    public void passOffer(Long offerId, Long userId) {
        CancellationOffer offer = offerRepository.findByIdWithDetails(offerId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "제안을 찾을 수 없습니다."));

        if (!offer.getCancellationCandidate().getUser().getId().equals(userId)) {
            throw new BaseException(GlobalErrorCode.ACCESS_DENIED, "자신의 취소표 제안만 거절할 수 있습니다.");
        }

        if (offer.getOfferStatus() != CancellationOffer.OfferStatus.UNACCEPTED && 
            offer.getOfferStatus() != CancellationOffer.OfferStatus.ACCEPTED) {
            return; // 이미 만료되었거나 다른 상태면 무시
        }

        log.info("취소표 제안 거절(Pass) 처리: offerId={}, userId={}", offerId, userId);
        offer.pass();

        // 즉시 다음 사람에게 기회 부여
        processRedistribution(offer.getCancellationCandidate().getSessionSeat());
    }

    /**
     * 만료된 제안들을 처리하고 다음 순번으로 넘깁니다.
     */
    @Transactional
    public void processExpiredOffers() {
        List<CancellationOffer> expiredOffers = offerRepository.findAllByOfferStatusAndOfferExpiresAtBefore(
                CancellationOffer.OfferStatus.UNACCEPTED,
                Instant.now());

        for (CancellationOffer offer : expiredOffers) {
            log.info("취소표 제안 만료 처리: offerId={}, userId={}", offer.getId(),
                    offer.getCancellationCandidate().getUser().getId());
            offer.expire();
            processRedistribution(offer.getCancellationCandidate().getSessionSeat());
        }
    }

    /**
     * 특정 좌석에 대해 다음 대기자를 찾아 재배분 프로세스를 진행합니다.
     */
    @Transactional
    public void processRedistribution(SessionSeat seat) {
        // 1. 현재 좌석에 대해 유효한(진행 중인) 제안이 있는지 확인하여 중복 방지
        Optional<CancellationOffer> activeOffer = offerRepository.findLatestBySessionSeatId(seat.getId());
        if (activeOffer.isPresent()) {
            CancellationOffer offer = activeOffer.get();
            // 결정 대기 중(UNACCEPTED)이거나 이미 결제 진행 중(ACCEPTED)이면 재배분 중단
            if ((offer.getOfferStatus() == CancellationOffer.OfferStatus.UNACCEPTED && Instant.now().isBefore(offer.getOfferExpiresAt())) ||
                offer.getOfferStatus() == CancellationOffer.OfferStatus.ACCEPTED) {
                log.info("이미 유효한 제안이 진행 중(상태: {})이므로 재배분을 중단합니다. seatId={}, offerId={}", 
                        offer.getOfferStatus(), seat.getId(), offer.getId());
                return;
            }
        }

        Optional<CancellationCandidate> nextCandidate;
        if (activeOffer.isPresent()) {
            // 마지막 제안 순번 다음의 대기자를 찾습니다.
            nextCandidate = candidateRepository
                    .findFirstBySessionSeatIdAndStatusAndWaitingRankGreaterThanOrderByWaitingRankAsc(
                            seat.getId(),
                            CancellationCandidate.Status.WAITING,
                            activeOffer.get().getCancellationCandidate().getWaitingRank());
        } else {
            // 제안이 한 번도 없었다면 1번 대기자부터 시작합니다.
            nextCandidate = candidateRepository.findFirstBySessionSeatIdAndStatusOrderByWaitingRankAsc(
                    seat.getId(),
                    CancellationCandidate.Status.WAITING);
        }

        if (nextCandidate.isPresent()) {
            // 2. 다음 대기자가 있으면 새로운 제안 생성 및 알림
            CancellationCandidate candidate = nextCandidate.get();
            Instant now = Instant.now();
            // 제안 받은 candidate는 취소 API 대상에서 빠지도록 WAITING에서 OFFERED로 먼저 전이합니다.
            candidate.offer(now);
            CancellationOffer newOffer = offerRepository.save(
                    CancellationOffer.builder()
                            .cancellationCandidate(candidate)
                            .offerStatus(CancellationOffer.OfferStatus.UNACCEPTED)
                            .offeredAt(now)
                            .offerExpiresAt(now.plus(1, ChronoUnit.HOURS))
                            .build());

            log.info("다음 대기자에게 취소표 제안: offerId={}, userId={}, seatId={}, rank={}",
                    newOffer.getId(), candidate.getUser().getId(), seat.getId(), candidate.getWaitingRank());

            // SMS 발송
            String phone = candidate.getUser().getPhoneNumber();
            if (phone != null && !phone.isBlank()) {
                smsNotificationService.sendCancellationNotifyMessage(phone, newOffer.getId());
            }

            // 좌석 상태 유지 (REALLOCATING)
        } else {
            // 3. 더 이상 대기자가 없으면 좌석을 AVAILABLE로 전환
            log.info("더 이상 대기자가 없어 좌석을 일반 판매로 전환합니다. seatId={}", seat.getId());
            seat.releaseToAvailable();
            sessionSeatRepository.save(seat);

            // WebSocket 동기화 (AVAILABLE)
            eventPublisher.publishEvent(
                    new SeatStatusChangedEvent(this, seat.getSession().getId(), List.of(seat.getId()),
                            SessionSeat.SaleStatus.AVAILABLE));
        }
    }
}
