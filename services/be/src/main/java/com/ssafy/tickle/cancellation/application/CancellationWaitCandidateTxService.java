package com.ssafy.tickle.cancellation.application;

import com.ssafy.tickle.cancellation.domain.CancellationCandidate;
import com.ssafy.tickle.cancellation.domain.CancellationErrorCode;
import com.ssafy.tickle.cancellation.domain.CancellationWaitSeatChangedEvent;
import com.ssafy.tickle.cancellation.infrastructure.persistence.CancellationCandidateRepository;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitCandidateCreateResponse;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitCandidateSeatResponse;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.reservation.domain.BookingTicket;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketRepository;
import com.ssafy.tickle.seat.domain.SeatErrorCode;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 예매 대기 신청의 DB 검증과 저장을 하나의 트랜잭션으로 처리하는 서비스 클래스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CancellationWaitCandidateTxService {

    private static final int MAX_BOOKING_AND_WAITING_COUNT = 4;
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
    private final UserRepository userRepository;
    private final SessionSeatRepository sessionSeatRepository;
    private final BookingTicketRepository bookingTicketRepository;
    private final CancellationCandidateRepository cancellationCandidateRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 회차 단위 Redis 락을 잡은 상태에서 예매 대기 신청을 생성합니다.
     *
     * @param eventId 공연 식별자
     * @param scheduleId 회차 식별자
     * @param userId 사용자 식별자
     * @param requestedSeatIds 요청 좌석 식별자 목록
     * @return 생성된 예매 대기 신청 정보
     */
    @Transactional
    public CancellationWaitCandidateCreateResponse createCandidatesInTransaction(
            Long eventId,
            Long scheduleId,
            Long userId,
            List<Long> requestedSeatIds
    ) {
        EventSession session = getSession(eventId, scheduleId);
        User user = getUser(userId);

        validateDuplicateCandidates(userId, requestedSeatIds);
        validateNotOwnedSeats(userId, requestedSeatIds);
        // 확정 예매 티켓과 활성 예매 대기를 회차 기준으로 합산해 사용자별 4매 제한을 적용합니다.
        validateBookingAndWaitingLimit(userId, scheduleId, requestedSeatIds.size());

        List<SessionSeat> seats = sessionSeatRepository.findAllWithPricePolicyBySessionIdAndIdIn(
                session.getId(),
                requestedSeatIds
        );
        validateRequestedSeats(requestedSeatIds, seats);
        validateWaitableSeats(seats);

        List<CancellationCandidate> candidates = seats.stream()
                .map(seat -> CancellationCandidate.builder()
                        .sessionSeat(seat)
                        .user(user)
                        // 회차 단위 락 안에서 현재 최대 순번 뒤에 붙여 waitingRank 충돌을 막습니다.
                        .waitingRank(nextWaitingRank(seat.getId()))
                        .status(CancellationCandidate.Status.WAITING)
                        .build())
                .toList();

        List<CancellationCandidate> savedCandidates = cancellationCandidateRepository.saveAll(candidates);
        List<CancellationWaitCandidateSeatResponse> responses = savedCandidates.stream()
                .map(CancellationWaitCandidateSeatResponse::from)
                .toList();

        List<Long> changedSeatIds = savedCandidates.stream()
                .map(candidate -> candidate.getSessionSeat().getId())
                .toList();
        eventPublisher.publishEvent(new CancellationWaitSeatChangedEvent(this, scheduleId, changedSeatIds));

        return new CancellationWaitCandidateCreateResponse(responses);
    }

    /**
     * 요청한 회차가 공연에 속하는지 검증하고 조회합니다.
     *
     * @param eventId 공연 식별자
     * @param scheduleId 회차 식별자
     * @return 조회된 회차
     */
    private EventSession getSession(Long eventId, Long scheduleId) {
        return eventSessionRepository.findByIdAndEventId(scheduleId, eventId)
                .orElseThrow(() -> new BaseException(
                        GlobalErrorCode.RESOURCE_NOT_FOUND,
                        "공연(%d)에 속하는 회차(%d)를 찾을 수 없습니다.".formatted(eventId, scheduleId)
                ));
    }

    /**
     * 사용자를 조회합니다.
     *
     * @param userId 사용자 식별자
     * @return 조회된 사용자
     */
    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "사용자를 찾을 수 없습니다."));
    }

    /**
     * 확정 예매 수와 예매 대기 신청 수의 합산 제한을 검증합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionId 회차 식별자
     * @param newCandidateCount 신규 신청 좌석 수
     */
    private void validateBookingAndWaitingLimit(Long userId, Long sessionId, int newCandidateCount) {
        long confirmedTicketCount = bookingTicketRepository.countByUserIdAndSessionIdAndTicketStatus(
                userId,
                sessionId,
                BookingTicket.Status.BOOKED
        );
        // 취소/만료된 신청은 사용자의 현재 점유 가능 수량에 영향을 주지 않으므로 WAITING만 집계합니다.
        long activeCandidateCount = cancellationCandidateRepository.countActiveByUserIdAndSessionId(userId, sessionId);

        if (confirmedTicketCount + activeCandidateCount + newCandidateCount > MAX_BOOKING_AND_WAITING_COUNT) {
            throw new BaseException(CancellationErrorCode.CANDIDATE_LIMIT_EXCEEDED);
        }
    }

    /**
     * 요청한 좌석이 모두 회차에 속하는지 검증합니다.
     *
     * @param requestedSeatIds 요청 좌석 식별자 목록
     * @param seats 조회된 회차 좌석 목록
     */
    private void validateRequestedSeats(List<Long> requestedSeatIds, List<SessionSeat> seats) {
        if (seats.size() != requestedSeatIds.size()) {
            throw new BaseException(SeatErrorCode.SEAT_NOT_FOUND);
        }

        // 조회 수량만으로는 다른 회차 좌석 누락을 설명하기 어려워 요청 ID별 포함 여부를 한 번 더 확인합니다.
        Map<Long, SessionSeat> seatById = seats.stream()
                .collect(Collectors.toMap(SessionSeat::getId, seat -> seat));
        for (Long requestedSeatId : requestedSeatIds) {
            if (!seatById.containsKey(requestedSeatId)) {
                throw new BaseException(SeatErrorCode.SEAT_NOT_FOUND);
            }
        }
    }

    /**
     * 예매 대기 신청 가능한 좌석 상태인지 검증합니다.
     *
     * @param seats 예매 대기 신청 대상 좌석 목록
     */
    private void validateWaitableSeats(List<SessionSeat> seats) {
        // 예매 가능한 좌석은 일반 예매 흐름 대상이므로 취소 가능성이 있는 판매 상태만 대기 신청을 허용합니다.
        boolean hasNotWaitableSeat = seats.stream()
                .anyMatch(seat -> !WAITABLE_SEAT_STATUSES.contains(seat.getSaleStatus()));
        if (hasNotWaitableSeat) {
            throw new BaseException(CancellationErrorCode.CANDIDATE_SEAT_NOT_WAITABLE);
        }
    }

    /**
     * 사용자가 같은 좌석에 이미 활성 예매 대기 중인지 검증합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionSeatIds 회차 좌석 식별자 목록
     */
    private void validateDuplicateCandidates(Long userId, List<Long> sessionSeatIds) {
        List<Long> duplicatedSeatIds = cancellationCandidateRepository
                .findActiveSessionSeatIdsByUserIdAndSessionSeatIds(userId, sessionSeatIds);
        if (!duplicatedSeatIds.isEmpty()) {
            throw new BaseException(CancellationErrorCode.CANDIDATE_DUPLICATE_SEAT);
        }
    }

    /**
     * 사용자가 이미 결제 진행 중이거나 예매 확정한 좌석인지 검증합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionSeatIds 회차 좌석 식별자 목록
     */
    private void validateNotOwnedSeats(Long userId, List<Long> sessionSeatIds) {
        List<Long> ownedSeatIds = bookingTicketRepository.findSessionSeatIdsByUserIdAndSessionSeatIdsAndTicketStatusIn(
                userId,
                sessionSeatIds,
                OWNED_TICKET_STATUSES
        );
        if (!ownedSeatIds.isEmpty()) {
            throw new BaseException(CancellationErrorCode.CANDIDATE_SEAT_NOT_WAITABLE);
        }
    }

    /**
     * 좌석별 다음 대기 순번을 계산합니다.
     *
     * @param sessionSeatId 회차 좌석 식별자
     * @return 다음 대기 순번
     */
    private int nextWaitingRank(Long sessionSeatId) {
        Integer maxWaitingRank = cancellationCandidateRepository.findMaxWaitingRankBySessionSeatId(sessionSeatId);
        return maxWaitingRank == null ? 1 : maxWaitingRank + 1;
    }
}
