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
import com.ssafy.tickle.seat.domain.EventSection;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    private final EventSessionRepository eventSessionRepository;
    private final SessionSeatRepository sessionSeatRepository;
    private final CancellationCandidateRepository cancellationCandidateRepository;
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
        queueStatusService.validateAdmitToken(QueueScope.CANCELLATION_WAIT, scheduleId, userId, admitToken);

        List<SessionSeat> sessionSeats = sessionSeatRepository.findBySessionIdWithDetails(scheduleId);
        List<Long> sessionSeatIds = sessionSeats.stream()
                .map(SessionSeat::getId)
                .toList();

        Map<Long, Long> waitingCounts = findWaitingCounts(sessionSeatIds);
        Set<Long> alreadyAppliedSeatIds = findAlreadyAppliedSeatIds(userId, sessionSeatIds);

        Map<EventSection, List<CancellationWaitSeatItemResponse>> seatsBySection = sessionSeats.stream()
                .collect(Collectors.groupingBy(
                        sessionSeat -> sessionSeat.getEventSeat().getEventSection(),
                        LinkedHashMap::new,
                        Collectors.mapping(
                                sessionSeat -> CancellationWaitSeatItemResponse.of(
                                        sessionSeat,
                                        waitingCounts.getOrDefault(sessionSeat.getId(), 0L),
                                        alreadyAppliedSeatIds.contains(sessionSeat.getId())
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
}
