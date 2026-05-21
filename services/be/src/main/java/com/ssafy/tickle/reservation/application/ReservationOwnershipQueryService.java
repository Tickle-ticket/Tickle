package com.ssafy.tickle.reservation.application;

import com.ssafy.tickle.cancellation.infrastructure.persistence.CancellationCandidateRepository;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.reservation.domain.BookingTicket;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketRepository;
import com.ssafy.tickle.reservation.presentation.dto.ReservationOwnershipCountResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 회차별 사용자 보유 티켓과 취소표 대기 좌석 수를 조회하는 서비스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReservationOwnershipQueryService {

    private static final List<BookingTicket.Status> OWNED_TICKET_STATUSES = List.of(
            BookingTicket.Status.PENDING_PAYMENT,
            BookingTicket.Status.BOOKED
    );

    private final EventSessionRepository eventSessionRepository;
    private final BookingTicketRepository bookingTicketRepository;
    private final CancellationCandidateRepository cancellationCandidateRepository;

    /**
     * 사용자가 특정 회차에서 이미 점유한 좌석 수를 조회합니다.
     *
     * <p>소유 티켓은 무통장 입금 대기인 {@code PENDING_PAYMENT}와 결제 완료인 {@code BOOKED}를 포함합니다.
     * 취소표 대기는 활성 상태인 {@code WAITING}, {@code OFFERED}를 포함합니다.</p>
     *
     * @param eventId 공연 식별자
     * @param sessionId 회차 식별자
     * @param userId 사용자 식별자
     * @return 보유/대기 좌석 수 응답
     */
    public ReservationOwnershipCountResponse getOwnershipCount(Long eventId, Long sessionId, Long userId) {
        EventSession session = eventSessionRepository.findByIdAndEventId(sessionId, eventId)
                .orElseThrow(() -> new BaseException(
                        GlobalErrorCode.RESOURCE_NOT_FOUND,
                        "공연(%d)에 속하는 회차(%d)를 찾을 수 없습니다.".formatted(eventId, sessionId)
                ));

        long ownedTicketCount = bookingTicketRepository.countByUserIdAndSessionIdAndTicketStatusIn(
                userId,
                session.getId(),
                OWNED_TICKET_STATUSES
        );
        long cancellationWaitSeatCount = cancellationCandidateRepository.countActiveByUserIdAndSessionId(
                userId,
                session.getId()
        );

        return ReservationOwnershipCountResponse.of(
                eventId,
                session.getId(),
                ownedTicketCount,
                cancellationWaitSeatCount
        );
    }
}
