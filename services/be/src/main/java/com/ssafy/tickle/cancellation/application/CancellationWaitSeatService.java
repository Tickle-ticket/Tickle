package com.ssafy.tickle.cancellation.application;

import com.ssafy.tickle.cancellation.infrastructure.persistence.CancellationCandidateRepository;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitSeatItemResponse;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitSeatMapResponse;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitSeatSectionResponse;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.queue.application.service.QueueStatusService;
import com.ssafy.tickle.queue.domain.QueueScope;
import com.ssafy.tickle.reservation.domain.BookingTicket;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketRepository;
import com.ssafy.tickle.seat.domain.EventSection;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 예매 대기 페이지용 좌석 조회를 담당합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CancellationWaitSeatService {

    private static final Set<SessionSeat.SaleStatus> WAITABLE_SEAT_STATUSES = EnumSet.of(
            SessionSeat.SaleStatus.PENDING,
            SessionSeat.SaleStatus.CONFIRMED,
            SessionSeat.SaleStatus.REALLOCATING
    );
    private static final List<BookingTicket.Status> OWNED_TICKET_STATUSES = List.of(
            BookingTicket.Status.PENDING_PAYMENT,
            BookingTicket.Status.BOOKED
    );

    private final EventSessionRepository eventSessionRepository;
    private final SessionSeatRepository sessionSeatRepository;
    private final CancellationCandidateRepository cancellationCandidateRepository;
    private final BookingTicketRepository bookingTicketRepository;
    private final QueueStatusService queueStatusService;

    /**
     * 예매 대기 페이지에서 사용할 좌석 목록과 좌석별 대기 현황을 조회합니다.
     *
     * @param eventId 공연 식별자
     * @param scheduleId 회차 식별자
     * @param userId 사용자 식별자
     * @param admitToken 예매 대기 큐 입장 토큰
     * @return 좌석별 대기 현황
     */
    public CancellationWaitSeatMapResponse getSeats(
            Long eventId,
            Long scheduleId,
            Long userId,
            String admitToken
    ) {
        validateSession(eventId, scheduleId);
        // 예매 대기 좌석맵은 cancellation wait 큐를 통과한 사용자에게만 노출합니다.
        queueStatusService.validateAdmitToken(QueueScope.CANCELLATION_WAIT, scheduleId, userId, admitToken);

        List<SessionSeat> sessionSeats = sessionSeatRepository.findBySessionIdWithDetails(scheduleId);
        List<Long> sessionSeatIds = sessionSeats.stream()
                .map(SessionSeat::getId)
                .toList();

        // 기존 좌석맵 데이터에 예매 대기 전용 집계값만 덧붙이기 위해 별도 조회로 분리합니다.
        Map<Long, Long> waitingCounts = findWaitingCounts(sessionSeatIds);
        Set<Long> alreadyAppliedSeatIds = findAlreadyAppliedSeatIds(userId, sessionSeatIds);
        Set<Long> ownedSeatIds = findOwnedSeatIds(userId, sessionSeatIds);

        Map<EventSection, List<CancellationWaitSeatItemResponse>> seatsBySection = sessionSeats.stream()
                .collect(Collectors.groupingBy(
                        sessionSeat -> sessionSeat.getEventSeat().getEventSection(),
                        LinkedHashMap::new,
                        Collectors.mapping(
                                sessionSeat -> CancellationWaitSeatItemResponse.of(
                                        sessionSeat,
                                        waitingCounts.getOrDefault(sessionSeat.getId(), 0L),
                                        isWaitable(sessionSeat, alreadyAppliedSeatIds, ownedSeatIds)
                                ),
                                Collectors.toList()
                        )
                ));

        List<CancellationWaitSeatSectionResponse> sections = seatsBySection.entrySet().stream()
                .map(entry -> CancellationWaitSeatSectionResponse.of(entry.getKey(), entry.getValue()))
                .toList();

        return new CancellationWaitSeatMapResponse(sections);
    }

    /**
     * 요청한 회차가 공연에 속하는지 검증합니다.
     *
     * @param eventId 공연 식별자
     * @param scheduleId 회차 식별자
     */
    private void validateSession(Long eventId, Long scheduleId) {
        eventSessionRepository.findByIdAndEventId(scheduleId, eventId)
                .orElseThrow(() -> new BaseException(
                        GlobalErrorCode.RESOURCE_NOT_FOUND,
                        "공연(%d)에 속하는 회차(%d)를 찾을 수 없습니다.".formatted(eventId, scheduleId)
                ));
    }

    /**
     * 좌석별 활성 예매 대기 인원 수를 조회합니다.
     *
     * @param sessionSeatIds 회차 좌석 식별자 목록
     * @return 회차 좌석 식별자별 활성 예매 대기 인원 수
     */
    private Map<Long, Long> findWaitingCounts(List<Long> sessionSeatIds) {
        if (sessionSeatIds.isEmpty()) {
            return Map.of();
        }

        return cancellationCandidateRepository.countActiveBySessionSeatIds(sessionSeatIds)
                .stream()
                .collect(Collectors.toMap(
                        CancellationCandidateRepository.WaitingCountProjection::getSessionSeatId,
                        CancellationCandidateRepository.WaitingCountProjection::getWaitingCount,
                        (left, right) -> left
                ));
    }

    /**
     * 사용자가 이미 활성 예매 대기 신청한 좌석 식별자를 조회합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionSeatIds 회차 좌석 식별자 목록
     * @return 사용자가 이미 신청한 회차 좌석 식별자 집합
     */
    private Set<Long> findAlreadyAppliedSeatIds(Long userId, List<Long> sessionSeatIds) {
        if (sessionSeatIds.isEmpty()) {
            return Set.of();
        }

        return cancellationCandidateRepository.findActiveSessionSeatIdsByUserIdAndSessionSeatIds(userId, sessionSeatIds)
                .stream()
                .collect(Collectors.toSet());
    }

    /**
     * 사용자가 이미 결제 진행 중이거나 예매 확정한 좌석 식별자를 조회합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionSeatIds 회차 좌석 식별자 목록
     * @return 사용자가 보유 중인 회차 좌석 식별자 집합
     */
    private Set<Long> findOwnedSeatIds(Long userId, List<Long> sessionSeatIds) {
        if (sessionSeatIds.isEmpty()) {
            return Set.of();
        }

        return bookingTicketRepository.findSessionSeatIdsByUserIdAndSessionSeatIdsAndTicketStatusIn(
                        userId,
                        sessionSeatIds,
                        OWNED_TICKET_STATUSES
                )
                .stream()
                .collect(Collectors.toSet());
    }

    /**
     * 요청 사용자 기준 예매 대기 신청 가능 여부를 반환합니다.
     *
     * @param sessionSeat 회차 좌석
     * @param alreadyAppliedSeatIds 사용자가 이미 예매 대기 신청한 좌석 식별자 집합
     * @param ownedSeatIds 사용자가 이미 보유 중인 좌석 식별자 집합
     * @return 예매 대기 신청 가능 여부
     */
    private boolean isWaitable(
            SessionSeat sessionSeat,
            Set<Long> alreadyAppliedSeatIds,
            Set<Long> ownedSeatIds
    ) {
        Long sessionSeatId = sessionSeat.getId();
        return WAITABLE_SEAT_STATUSES.contains(sessionSeat.getSaleStatus())
                && !alreadyAppliedSeatIds.contains(sessionSeatId)
                && !ownedSeatIds.contains(sessionSeatId);
    }
}
