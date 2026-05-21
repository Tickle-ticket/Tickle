package com.ssafy.tickle.seat.application;

import com.ssafy.tickle.seat.domain.SeatStatusChangedEvent;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.seat.infrastructure.redis.SeatHoldKeyStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Redis TTL 만료로 인한 좌석 선점 자동 해제를 처리하는 서비스입니다.
 *
 * <p>Redis Keyspace Notification에서 {@code held:{scheduleId}:{userId}} 키가 만료되면
 * 이 핸들러가 호출됩니다. 만료 시에는 Redis 값을 읽을 수 없으므로
 * DB에서 {@code heldByUserId}를 기준으로 좌석을 조회하여 일괄 해제합니다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SeatHoldExpiredHandler {

    private final SessionSeatRepository sessionSeatRepository;
    private final SeatHoldKeyStore seatHoldKeyStore;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 선점 TTL 만료 처리 — DB 조회 → 일괄 해제 → WebSocket 브로드캐스트.
     *
     * @param scheduleId 회차 식별자 (만료된 키 이름에서 파싱)
     * @param userId     사용자 식별자 (만료된 키 이름에서 파싱)
     */
    @Transactional
    public void handle(Long scheduleId, Long userId) {
        List<SessionSeat> seats = sessionSeatRepository.findAllBySessionIdAndHeldByUserIdAndSaleStatus(
                scheduleId, userId, SessionSeat.SaleStatus.HELD
        );

        if (seats.isEmpty()) {
            log.debug("[TTL 만료] 해제할 선점 없음 — scheduleId={} userId={}", scheduleId, userId);
            return;
        }

        seats.forEach(SessionSeat::release);
        sessionSeatRepository.saveAll(seats);

        // Redis 키는 이미 만료됐지만, 수동 해제와의 레이스 방지를 위해 idempotent 삭제
        seatHoldKeyStore.deleteHeld(scheduleId, userId);

        List<Long> releasedIds = seats.stream().map(SessionSeat::getId).toList();
        eventPublisher.publishEvent(
                new SeatStatusChangedEvent(this, scheduleId, releasedIds, SessionSeat.SaleStatus.AVAILABLE)
        );

        log.info("[TTL 만료] 선점 자동 해제 — scheduleId={} userId={} seats={}", scheduleId, userId, releasedIds);
    }
}
