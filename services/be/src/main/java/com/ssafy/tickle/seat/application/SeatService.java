package com.ssafy.tickle.seat.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.common.util.RedisLockManager;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.seat.domain.EventSection;
import com.ssafy.tickle.seat.domain.SeatErrorCode;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.seat.infrastructure.redis.SeatHoldKeyStore;
import com.ssafy.tickle.seat.presentation.dto.SeatHoldRequest;
import com.ssafy.tickle.seat.presentation.dto.SeatHoldResponse;
import com.ssafy.tickle.seat.presentation.dto.SeatItemResponse;
import com.ssafy.tickle.seat.presentation.dto.SeatMapResponse;
import com.ssafy.tickle.seat.presentation.dto.SeatSectionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 좌석 관련 비즈니스 로직을 처리하는 서비스 클래스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SeatService {

    private static final String LOCK_KEY_PREFIX = "seat-hold:";
    private static final int HOLD_MINUTES = 15;

    private final EventSessionRepository eventSessionRepository;
    private final SessionSeatRepository sessionSeatRepository;
    private final RedisLockManager redisLockManager;
    private final SeatHoldKeyStore seatHoldKeyStore;

    /**
     * 공연 회차의 전체 좌석 배치도(상태)를 구역별로 조회합니다.
     *
     * <p>FE 하드코딩 배치도(좌표)와 합산하여 렌더링하기 위한 상태 정보만 반환합니다.
     * 최초 1회 호출 후 이후 변경분은 WebSocket Push로 수신합니다.</p>
     *
     * @param eventId    공연 식별자
     * @param scheduleId 회차 식별자
     * @return 구역별 좌석 상태 배치도
     */
    public SeatMapResponse getSeatMap(Long eventId, Long scheduleId) {
        validateSession(eventId, scheduleId);

        List<SessionSeat> sessionSeats = sessionSeatRepository.findBySessionIdWithDetails(scheduleId);

        Map<EventSection, List<SeatItemResponse>> seatsBySection = sessionSeats.stream()
                .collect(Collectors.groupingBy(
                        ss -> ss.getEventSeat().getEventSection(),
                        LinkedHashMap::new,
                        Collectors.mapping(SeatItemResponse::from, Collectors.toList())
                ));

        List<SeatSectionResponse> sections = seatsBySection.entrySet().stream()
                .map(entry -> SeatSectionResponse.of(entry.getKey(), entry.getValue()))
                .toList();

        return new SeatMapResponse(sections);
    }

    /**
     * 선택한 좌석 전체를 동시에 선점합니다 (All-or-Nothing).
     *
     * <p>세션 단위 분산 락으로 동시 요청을 직렬화하고,
     * 하나라도 선점 불가 좌석이 있으면 전체 실패합니다.
     * 성공 시 Redis에 15분 TTL 키를 등록합니다.</p>
     *
     * @param eventId    공연 식별자
     * @param scheduleId 회차 식별자
     * @param userId     선점 사용자 식별자
     * @param request    선점 요청 (sessionSeatId 목록)
     * @return 선점 완료된 좌석 ID 목록과 만료 시각
     */
    @Transactional
    public SeatHoldResponse holdSeats(Long eventId, Long scheduleId, Long userId, SeatHoldRequest request) {
        validateSession(eventId, scheduleId);

        String lockKey = LOCK_KEY_PREFIX + scheduleId;
        if (!redisLockManager.tryLock(lockKey)) {
            throw new BaseException(SeatErrorCode.SEAT_LOCK_FAILED);
        }

        try {
            List<SessionSeat> seats = loadSeats(request.sessionSeatIds());

            // All-or-Nothing: 모든 좌석 선점 시도 (AVAILABLE 아니면 내부에서 예외 발생)
            seats.forEach(SessionSeat::hold);
            sessionSeatRepository.saveAll(seats);

            // Redis TTL 키 등록 (15분) — 만료 이벤트 처리는 ws 이슈에서 구현
            Instant expiresAt = Instant.now().plus(HOLD_MINUTES, ChronoUnit.MINUTES);
            seatHoldKeyStore.registerHeld(scheduleId, userId, request.sessionSeatIds());

            return new SeatHoldResponse(request.sessionSeatIds(), expiresAt);
        } finally {
            redisLockManager.unlock(lockKey);
        }
    }

    /**
     * 사용자가 선점한 좌석 전체를 해제합니다.
     *
     * <p>Redis에서 해당 사용자의 선점 좌석 목록을 조회하여 일괄 해제합니다.
     * 이미 해제된 경우 멱등성을 보장하여 조용히 반환합니다.</p>
     *
     * @param eventId    공연 식별자
     * @param scheduleId 회차 식별자
     * @param userId     사용자 식별자
     */
    @Transactional
    public void releaseSeats(Long eventId, Long scheduleId, Long userId) {
        validateSession(eventId, scheduleId);

        List<Long> heldSeatIds = seatHoldKeyStore.getHeldSeatIds(scheduleId, userId);
        if (heldSeatIds.isEmpty()) {
            return; // 이미 해제됨 or 선점 없음 — 멱등성 보장
        }

        List<SessionSeat> seats = loadSeats(heldSeatIds);
        seats.forEach(SessionSeat::release);
        sessionSeatRepository.saveAll(seats);

        seatHoldKeyStore.deleteHeld(scheduleId, userId);
    }

    /**
     * 회차가 해당 공연에 속하는지 검증합니다.
     *
     * <p>공연 존재 여부와 회차 소속 여부를 단일 쿼리로 검증하여
     * 불필요한 DB 조회를 최소화합니다.</p>
     *
     * @param eventId    공연 식별자
     * @param scheduleId 회차 식별자
     * @throws BaseException 공연 또는 회차를 찾을 수 없는 경우
     */
    private void validateSession(Long eventId, Long scheduleId) {
        eventSessionRepository.findByIdAndEventId(scheduleId, eventId)
                .orElseThrow(() -> new BaseException(
                        GlobalErrorCode.RESOURCE_NOT_FOUND,
                        "공연(%d)에 속하는 회차(%d)를 찾을 수 없습니다.".formatted(eventId, scheduleId)
                ));
    }

    /**
     * 좌석 ID 목록으로 SessionSeat을 조회하고, 누락된 ID가 있으면 예외를 발생시킵니다.
     *
     * @param seatIds 조회할 sessionSeat ID 목록
     * @return 조회된 SessionSeat 목록
     * @throws BaseException 요청한 ID 중 존재하지 않는 경우 (SEAT_NOT_FOUND)
     */
    private List<SessionSeat> loadSeats(List<Long> seatIds) {
        List<SessionSeat> seats = sessionSeatRepository.findAllByIdIn(seatIds);
        if (seats.size() != seatIds.size()) {
            throw new BaseException(SeatErrorCode.SEAT_NOT_FOUND);
        }
        return seats;
    }
}
