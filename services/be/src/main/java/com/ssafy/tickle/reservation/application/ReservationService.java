package com.ssafy.tickle.reservation.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.payment.infrastructure.persistence.PaymentRepository;
import com.ssafy.tickle.reservation.domain.Booking;
import com.ssafy.tickle.reservation.domain.BookingTicket;
import com.ssafy.tickle.reservation.domain.ReservationErrorCode;
import com.ssafy.tickle.reservation.infrastructure.messaging.model.BookingCancelledEvent;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingRepository;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketRepository;
import com.ssafy.tickle.reservation.presentation.dto.ReservationDetailResponse;
import com.ssafy.tickle.reservation.presentation.dto.ReservationListResponse;
import com.ssafy.tickle.reservation.presentation.dto.ReservationSummaryResponse;
import com.ssafy.tickle.reservation.presentation.dto.ReservationTicketResponse;
import com.ssafy.tickle.seat.domain.SeatStatusChangedEvent;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.cancellation.application.CancellationRedistributionService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

/**
 * 예매 관련 비즈니스 로직을 처리하는 서비스 클래스입니다.
 *
 * <p>예매 목록 조회, 예매 상세 조회, 예매 취소를 담당한다.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReservationService {

    private static final Set<Booking.Status> CANCELLABLE_STATUSES = Set.of(
            Booking.Status.DRAFT,
            Booking.Status.CONFIRMED,
            Booking.Status.PENDING_PAYMENT
    );

    private final BookingRepository bookingRepository;
    private final BookingTicketRepository bookingTicketRepository;
    private final PaymentRepository paymentRepository;
    private final SessionSeatRepository sessionSeatRepository;
    private final CancellationRedistributionService cancellationRedistributionService;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 사용자의 전체 예매 목록을 최신순으로 조회합니다.
     *
     * @param userId 사용자 식별자
     * @return 예매 요약 목록
     */
    public ReservationListResponse getReservationList(Long userId) {
        List<ReservationSummaryResponse> items = bookingRepository.findAllByUserId(userId)
                .stream()
                .map(ReservationSummaryResponse::from)
                .toList();

        return new ReservationListResponse(items);
    }

    /**
     * 특정 예매의 상세 정보를 조회합니다.
     *
     * <p>본인 소유 예매가 아닌 경우 403 예외를 발생시킨다.</p>
     *
     * @param reservationId 예매 식별자
     * @param userId        사용자 식별자
     * @return 예매 상세 응답
     */
    public ReservationDetailResponse getReservationDetail(Long reservationId, Long userId) {
        Booking booking = findBookingOwnedByUser(reservationId, userId);

        List<ReservationTicketResponse> tickets = bookingTicketRepository.findAllByBookingId(reservationId)
                .stream()
                .map(ReservationTicketResponse::from)
                .toList();
        Long paymentId = paymentRepository.findTopByBookingIdOrderByIdDesc(reservationId)
                .map(payment -> payment.getId())
                .orElse(null);

        return ReservationDetailResponse.from(booking, paymentId, tickets);
    }

    /**
     * 예매를 취소합니다.
     *
     * <p>취소 가능 상태: DRAFT / PENDING_PAYMENT / CONFIRMED</p>
     * <ul>
     *   <li>DRAFT: 결제 전 초안 — 좌석 AVAILABLE 복귀, Kafka 발행 생략 (환불 없음)</li>
     *   <li>PENDING_PAYMENT / CONFIRMED: 좌석 REALLOCATING, Kafka로 환불 비동기 요청</li>
     * </ul>
     *
     * <p>모든 상태 전환 후 WebSocket 이벤트(SeatStatusChangedEvent)와
     * 취소 이벤트(BookingCancelledEvent)를 발행한다.
     * Kafka 실제 전송은 트랜잭션 커밋 후 {@code BookingCancelEventListener}가 처리한다.</p>
     *
     * @param reservationId 예매 식별자
     * @param userId        사용자 식별자
     */
    @Transactional
    public void cancelReservation(Long reservationId, Long userId) {
        Booking booking = findBookingOwnedByUser(reservationId, userId);
        validateCancellable(booking);

        Instant now = Instant.now();
        List<BookingTicket> tickets = bookingTicketRepository.findAllByBookingId(reservationId);

        // 좌석 목록을 ID 오름차순으로 정렬해 데드락을 방지한다
        List<Long> sessionSeatIds = tickets.stream()
                .map(ticket -> ticket.getSessionSeat().getId())
                .sorted()
                .toList();

        List<SessionSeat> seats = sessionSeatRepository.findAllByIdIn(sessionSeatIds)
                .stream()
                .sorted(Comparator.comparing(SessionSeat::getId))
                .toList();

        boolean isDraft = booking.getBookingStatus() == Booking.Status.DRAFT;
        boolean isCancellationOffer = booking.getCancellationOfferId() != null;
        SessionSeat.SaleStatus nextSeatStatus;

        if (isDraft && !isCancellationOffer) {
            // 일반 DRAFT: 결제 전이므로 좌석을 AVAILABLE로 즉시 복귀
            seats.forEach(SessionSeat::release);
            nextSeatStatus = SessionSeat.SaleStatus.AVAILABLE;
        } else {
            // PENDING_PAYMENT / CONFIRMED / 취소표 DRAFT: 취소표 재배분 대기
            seats.forEach(SessionSeat::cancelForReallocation);
            nextSeatStatus = SessionSeat.SaleStatus.REALLOCATING;
            
        }

        tickets.forEach(ticket -> ticket.cancel(now));
        booking.cancel(now);
        sessionSeatRepository.saveAll(seats);

        // 취소표 구매로 만들어진 예매라면 티켓 취소 후 ACCEPTED offer를 닫고 다음 대기자에게 기회를 넘깁니다.
        if (isCancellationOffer) {
            cancellationRedistributionService.releaseAcceptedOfferAfterReservationCancel(
                    booking.getCancellationOfferId(),
                    userId
            );
        }

        // WebSocket 브로드캐스트 — 커밋 후 @TransactionalEventListener 처리
        eventPublisher.publishEvent(new SeatStatusChangedEvent(
                this,
                booking.getSession().getId(),
                sessionSeatIds,
                nextSeatStatus
        ));

        // 취소 이벤트 — 커밋 후 BookingCancelEventListener 가 Kafka 발행 (DRAFT는 생략)
        eventPublisher.publishEvent(new BookingCancelledEvent(
                this,
                reservationId,
                userId,
                sessionSeatIds,
                now,
                !isDraft
        ));
    }

    /**
     * 예매 ID와 사용자 ID로 예매를 조회하고, 본인 소유가 아니면 예외를 발생시킵니다.
     *
     * @param reservationId 예매 식별자
     * @param userId        사용자 식별자
     * @return 예매 엔티티
     */
    private Booking findBookingOwnedByUser(Long reservationId, Long userId) {
        return bookingRepository.findByIdAndUserId(reservationId, userId)
                .orElseThrow(() -> {
                    boolean exists = bookingRepository.existsById(reservationId);
                    return exists
                            ? new BaseException(ReservationErrorCode.BOOKING_ACCESS_DENIED)
                            : new BaseException(ReservationErrorCode.BOOKING_NOT_FOUND);
                });
    }

    /**
     * 예매가 취소 가능한 상태인지 검증합니다.
     *
     * @param booking 예매 엔티티
     */
    private void validateCancellable(Booking booking) {
        if (booking.getBookingStatus() == Booking.Status.CANCELLED) {
            throw new BaseException(ReservationErrorCode.BOOKING_ALREADY_CANCELLED);
        }
        if (!CANCELLABLE_STATUSES.contains(booking.getBookingStatus())) {
            throw new BaseException(ReservationErrorCode.BOOKING_NOT_CANCELLABLE);
        }
    }
}
