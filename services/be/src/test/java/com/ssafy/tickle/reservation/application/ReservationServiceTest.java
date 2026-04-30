package com.ssafy.tickle.reservation.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.reservation.domain.Booking;
import com.ssafy.tickle.reservation.domain.BookingTicket;
import com.ssafy.tickle.reservation.domain.ReservationErrorCode;
import com.ssafy.tickle.reservation.infrastructure.messaging.producer.BookingCancelProducer;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingRepository;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketRepository;
import com.ssafy.tickle.reservation.presentation.dto.ReservationDetailResponse;
import com.ssafy.tickle.reservation.presentation.dto.ReservationListResponse;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.venue.domain.Venue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * ReservationService 단위 테스트입니다.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ReservationService 단위 테스트")
class ReservationServiceTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private BookingTicketRepository bookingTicketRepository;
    @Mock private BookingCancelProducer bookingCancelProducer;

    @InjectMocks private ReservationService reservationService;

    private static final Long USER_ID       = 1L;
    private static final Long BOOKING_ID    = 10L;
    private static final Long SEAT_ID       = 100L;

    private Booking confirmedBooking;
    private Booking cancelledBooking;
    private BookingTicket ticket;

    @BeforeEach
    void setUp() {
        // 공통 의존 객체 mock
        Venue venue = mock(Venue.class);
        given(venue.getVenueName()).willReturn("올림픽스타디움");

        Event event = mock(Event.class);
        given(event.getTitle()).willReturn("아이유 콘서트");
        given(event.getVenue()).willReturn(venue);

        EventSession session = mock(EventSession.class);
        given(session.getEvent()).willReturn(event);
        given(session.getSessionNo()).willReturn(1);
        given(session.getStartAt()).willReturn(Instant.now());

        // CONFIRMED 예매
        confirmedBooking = mock(Booking.class);
        given(confirmedBooking.getId()).willReturn(BOOKING_ID);
        given(confirmedBooking.getBookingNo()).willReturn("BK-001");
        given(confirmedBooking.getBookingStatus()).willReturn(Booking.Status.CONFIRMED);
        given(confirmedBooking.getSession()).willReturn(session);
        given(confirmedBooking.getTicketCount()).willReturn(2);
        given(confirmedBooking.getTotalPaidAmount()).willReturn(new BigDecimal("176000.00"));
        given(confirmedBooking.getCreatedAt()).willReturn(Instant.now());

        // CANCELLED 예매
        cancelledBooking = mock(Booking.class);
        given(cancelledBooking.getBookingStatus()).willReturn(Booking.Status.CANCELLED);

        // 티켓
        SessionSeat sessionSeat = mock(SessionSeat.class);
        given(sessionSeat.getId()).willReturn(SEAT_ID);

        ticket = mock(BookingTicket.class);
        given(ticket.getSessionSeat()).willReturn(sessionSeat);
    }

    // ── getReservationList ────────────────────────────────────────
    @Nested
    @DisplayName("예매 목록 조회 (getReservationList)")
    class GetReservationListTest {

        @Test
        @DisplayName("예매 목록을 정상 반환한다")
        void getReservationList_success() {
            // given
            given(bookingRepository.findAllByUserId(USER_ID)).willReturn(List.of(confirmedBooking));

            // when
            ReservationListResponse response = reservationService.getReservationList(USER_ID);

            // then
            assertThat(response.items()).hasSize(1);
            assertThat(response.items().get(0).bookingId()).isEqualTo(BOOKING_ID);
            assertThat(response.items().get(0).bookingStatus()).isEqualTo("CONFIRMED");
        }

        @Test
        @DisplayName("예매가 없으면 빈 목록을 반환한다")
        void getReservationList_empty() {
            // given
            given(bookingRepository.findAllByUserId(USER_ID)).willReturn(List.of());

            // when
            ReservationListResponse response = reservationService.getReservationList(USER_ID);

            // then
            assertThat(response.items()).isEmpty();
        }
    }

    // ── getReservationDetail ─────────────────────────────────────
    @Nested
    @DisplayName("예매 상세 조회 (getReservationDetail)")
    class GetReservationDetailTest {

        @Test
        @DisplayName("본인 예매 상세를 정상 반환한다")
        void getReservationDetail_success() {
            // given
            given(bookingRepository.findByIdAndUserId(BOOKING_ID, USER_ID))
                    .willReturn(Optional.of(confirmedBooking));
            given(bookingTicketRepository.findAllByBookingId(BOOKING_ID))
                    .willReturn(List.of());

            // when
            ReservationDetailResponse response = reservationService.getReservationDetail(BOOKING_ID, USER_ID);

            // then
            assertThat(response.bookingId()).isEqualTo(BOOKING_ID);
            assertThat(response.tickets()).isEmpty();
        }

        @Test
        @DisplayName("존재하지 않는 예매 조회 시 BOOKING_NOT_FOUND 예외를 던진다")
        void getReservationDetail_notFound() {
            // given
            given(bookingRepository.findByIdAndUserId(BOOKING_ID, USER_ID)).willReturn(Optional.empty());
            given(bookingRepository.existsById(BOOKING_ID)).willReturn(false);

            // when & then
            assertThatThrownBy(() -> reservationService.getReservationDetail(BOOKING_ID, USER_ID))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(ReservationErrorCode.BOOKING_NOT_FOUND));
        }

        @Test
        @DisplayName("타인 예매 조회 시 BOOKING_ACCESS_DENIED 예외를 던진다")
        void getReservationDetail_accessDenied() {
            // given
            given(bookingRepository.findByIdAndUserId(BOOKING_ID, USER_ID)).willReturn(Optional.empty());
            given(bookingRepository.existsById(BOOKING_ID)).willReturn(true);

            // when & then
            assertThatThrownBy(() -> reservationService.getReservationDetail(BOOKING_ID, USER_ID))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(ReservationErrorCode.BOOKING_ACCESS_DENIED));
        }
    }

    // ── cancelReservation ────────────────────────────────────────
    @Nested
    @DisplayName("예매 취소 (cancelReservation)")
    class CancelReservationTest {

        @Test
        @DisplayName("CONFIRMED 상태 예매를 정상 취소하고 Kafka 이벤트를 발행한다")
        void cancelReservation_confirmed_success() {
            // given
            given(bookingRepository.findByIdAndUserId(BOOKING_ID, USER_ID))
                    .willReturn(Optional.of(confirmedBooking));
            given(bookingTicketRepository.findAllByBookingId(BOOKING_ID)).willReturn(List.of(ticket));
            willDoNothing().given(bookingCancelProducer).publish(any());

            // when
            reservationService.cancelReservation(BOOKING_ID, USER_ID);

            // then
            verify(confirmedBooking).cancel(any(Instant.class));
            verify(ticket).cancel(any(Instant.class));
            verify(bookingCancelProducer).publish(any());
        }

        @Test
        @DisplayName("이미 취소된 예매는 BOOKING_ALREADY_CANCELLED 예외를 던진다")
        void cancelReservation_alreadyCancelled_throwsException() {
            // given
            given(bookingRepository.findByIdAndUserId(BOOKING_ID, USER_ID))
                    .willReturn(Optional.of(cancelledBooking));

            // when & then
            assertThatThrownBy(() -> reservationService.cancelReservation(BOOKING_ID, USER_ID))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(ReservationErrorCode.BOOKING_ALREADY_CANCELLED));

            verify(bookingCancelProducer, never()).publish(any());
        }

        @Test
        @DisplayName("취소 불가 상태 예매는 BOOKING_NOT_CANCELLABLE 예외를 던진다")
        void cancelReservation_notCancellable_throwsException() {
            // given
            Booking refundingBooking = mock(Booking.class);
            given(refundingBooking.getBookingStatus()).willReturn(Booking.Status.REFUND_IN_PROGRESS);
            given(bookingRepository.findByIdAndUserId(BOOKING_ID, USER_ID))
                    .willReturn(Optional.of(refundingBooking));

            // when & then
            assertThatThrownBy(() -> reservationService.cancelReservation(BOOKING_ID, USER_ID))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(ReservationErrorCode.BOOKING_NOT_CANCELLABLE));

            verify(bookingCancelProducer, never()).publish(any());
        }

        @Test
        @DisplayName("Kafka 발행 실패 시 예외가 전파된다")
        void cancelReservation_kafkaFails_propagatesException() {
            // given
            given(bookingRepository.findByIdAndUserId(BOOKING_ID, USER_ID))
                    .willReturn(Optional.of(confirmedBooking));
            given(bookingTicketRepository.findAllByBookingId(BOOKING_ID)).willReturn(List.of(ticket));
            org.mockito.BDDMockito.willThrow(new IllegalStateException("Kafka 브로커 연결 실패"))
                    .given(bookingCancelProducer).publish(any());

            // when & then
            assertThatThrownBy(() -> reservationService.cancelReservation(BOOKING_ID, USER_ID))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Kafka");
        }

        @Test
        @DisplayName("취소 Kafka 메시지에 sessionSeatId 목록이 올바르게 담긴다")
        void cancelReservation_kafkaMessageContainsSeatIds() {
            // given
            given(bookingRepository.findByIdAndUserId(BOOKING_ID, USER_ID))
                    .willReturn(Optional.of(confirmedBooking));
            given(bookingTicketRepository.findAllByBookingId(BOOKING_ID)).willReturn(List.of(ticket));
            willDoNothing().given(bookingCancelProducer).publish(
                    org.mockito.ArgumentMatchers.argThat(msg ->
                            msg.bookingId().equals(BOOKING_ID) &&
                            msg.userId().equals(USER_ID) &&
                            msg.sessionSeatIds().contains(SEAT_ID)
                    )
            );

            // when
            reservationService.cancelReservation(BOOKING_ID, USER_ID);

            // then: argThat 검증이 통과했으면 성공
            verify(bookingCancelProducer).publish(any());
        }
    }
}
