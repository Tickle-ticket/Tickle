package com.ssafy.tickle.reservation.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.reservation.domain.Booking;
import com.ssafy.tickle.reservation.domain.BookingTicket;
import com.ssafy.tickle.reservation.domain.ReservationErrorCode;
import com.ssafy.tickle.reservation.infrastructure.messaging.model.BookingCancelMessage;
import com.ssafy.tickle.reservation.infrastructure.messaging.producer.BookingCancelProducer;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingRepository;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketRepository;
import com.ssafy.tickle.reservation.presentation.dto.ReservationDetailResponse;
import com.ssafy.tickle.reservation.presentation.dto.ReservationListResponse;
import com.ssafy.tickle.reservation.presentation.dto.ReservationSummaryResponse;
import com.ssafy.tickle.reservation.presentation.dto.ReservationTicketResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
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
            Booking.Status.CONFIRMED,
            Booking.Status.PENDING_PAYMENT
    );

    private final BookingRepository bookingRepository;
    private final BookingTicketRepository bookingTicketRepository;
    private final BookingCancelProducer bookingCancelProducer;

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

        return ReservationDetailResponse.from(booking, tickets);
    }

    /**
     * 예매를 취소하고 Kafka로 취소 이벤트를 발행합니다.
     *
     * <p>CONFIRMED / PENDING_PAYMENT 상태만 취소 가능하다.
     * 취소 처리(상태 변경) 후 Kafka 이벤트를 발행하여 좌석 해제·환불이 비동기로 처리되도록 한다.</p>
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

        // 티켓 상태 → CANCELLED
        tickets.forEach(ticket -> ticket.cancel(now));

        // 예매 상태 → CANCELLED
        booking.cancel(now);

        // 좌석 해제 / 환불 처리를 위한 Kafka 이벤트 발행
        List<Long> sessionSeatIds = tickets.stream()
                .map(ticket -> ticket.getSessionSeat().getId())
                .toList();

        bookingCancelProducer.publish(new BookingCancelMessage(
                reservationId,
                userId,
                sessionSeatIds,
                now
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
                    // 예매 존재 여부와 무관하게 소유권 미확인 시 403 반환 (정보 노출 방지)
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
