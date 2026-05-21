package com.ssafy.tickle.reservation.application;

import com.ssafy.tickle.cancellation.infrastructure.persistence.CancellationCandidateRepository;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.reservation.domain.BookingTicket;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketRepository;
import com.ssafy.tickle.reservation.presentation.dto.ReservationOwnershipCountResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/**
 * ReservationOwnershipQueryService 단위 테스트입니다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ReservationOwnershipQueryService 단위 테스트")
class ReservationOwnershipQueryServiceTest {

    private static final Long EVENT_ID = 3001L;
    private static final Long SESSION_ID = 4001L;
    private static final Long USER_ID = 1001L;

    @Mock private EventSessionRepository eventSessionRepository;
    @Mock private BookingTicketRepository bookingTicketRepository;
    @Mock private CancellationCandidateRepository cancellationCandidateRepository;

    @InjectMocks private ReservationOwnershipQueryService reservationOwnershipQueryService;

    @Test
    @DisplayName("소유 티켓 수와 활성 취소표 대기 좌석 수를 합산해 반환한다")
    void getOwnershipCount_success() {
        // given
        EventSession session = mock(EventSession.class);
        given(session.getId()).willReturn(SESSION_ID);
        given(eventSessionRepository.findByIdAndEventId(SESSION_ID, EVENT_ID)).willReturn(Optional.of(session));
        given(bookingTicketRepository.countByUserIdAndSessionIdAndTicketStatusIn(
                USER_ID,
                SESSION_ID,
                List.of(BookingTicket.Status.PENDING_PAYMENT, BookingTicket.Status.BOOKED)
        )).willReturn(2L);
        given(cancellationCandidateRepository.countActiveByUserIdAndSessionId(USER_ID, SESSION_ID)).willReturn(1L);

        // when
        ReservationOwnershipCountResponse response = reservationOwnershipQueryService.getOwnershipCount(
                EVENT_ID,
                SESSION_ID,
                USER_ID
        );

        // then
        assertThat(response.eventId()).isEqualTo(EVENT_ID);
        assertThat(response.sessionId()).isEqualTo(SESSION_ID);
        assertThat(response.ownedTicketCount()).isEqualTo(2L);
        assertThat(response.cancellationWaitSeatCount()).isEqualTo(1L);
        assertThat(response.totalCount()).isEqualTo(3L);
    }

    @Test
    @DisplayName("공연에 속한 회차가 없으면 RESOURCE_NOT_FOUND 예외를 던진다")
    void getOwnershipCount_sessionNotFound() {
        // given
        given(eventSessionRepository.findByIdAndEventId(SESSION_ID, EVENT_ID)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> reservationOwnershipQueryService.getOwnershipCount(EVENT_ID, SESSION_ID, USER_ID))
                .isInstanceOf(BaseException.class)
                .satisfies(e -> assertThat(((BaseException) e).getErrorCode()).isEqualTo(GlobalErrorCode.RESOURCE_NOT_FOUND));
    }

    @Test
    @DisplayName("소유 티켓은 PENDING_PAYMENT와 BOOKED만 조회한다")
    void getOwnershipCount_ownedTicketStatuses() {
        // given
        EventSession session = mock(EventSession.class);
        given(session.getId()).willReturn(SESSION_ID);
        given(eventSessionRepository.findByIdAndEventId(SESSION_ID, EVENT_ID)).willReturn(Optional.of(session));

        // when
        reservationOwnershipQueryService.getOwnershipCount(EVENT_ID, SESSION_ID, USER_ID);

        // then
        verify(bookingTicketRepository).countByUserIdAndSessionIdAndTicketStatusIn(
                USER_ID,
                SESSION_ID,
                List.of(BookingTicket.Status.PENDING_PAYMENT, BookingTicket.Status.BOOKED)
        );
    }
}
