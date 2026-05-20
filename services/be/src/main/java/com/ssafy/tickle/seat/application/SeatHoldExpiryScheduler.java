package com.ssafy.tickle.seat.application;

import com.ssafy.tickle.seat.domain.SeatStatusChangedEvent;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.seat.infrastructure.redis.SeatHoldKeyStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * HOLD 만료 좌석을 DB에서 직접 탐지해 복구하는 폴백 스케줄러입니다.
 *
 * <p>Redis Keyspace Notification은 AT-MOST-ONCE 보장이라 이벤트가 유실될 수 있습니다.
 * 이 스케줄러는 5분마다 DB를 확인해, HOLD_MINUTES(15분)를 초과해 HELD 상태로 남은
 * 좌석을 강제로 AVAILABLE로 복구합니다. 정상 경로({@link SeatHoldExpiredHandler})가
 * 이미 처리했다면 해당 좌석은 HELD 상태가 아니므로 쿼리에서 제외됩니다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SeatHoldExpiryScheduler {

    private static final int HOLD_MINUTES = 15;
    // 만료 판정에 1분 여유를 두어 정상 경로와 충돌을 방지한다.
    private static final int EXPIRY_BUFFER_MINUTES = 1;

    private final SessionSeatRepository sessionSeatRepository;
    private final SeatHoldKeyStore seatHoldKeyStore;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 만료된 HELD 좌석을 AVAILABLE로 복구합니다.
     *
     * <p>5분 주기로 실행되며, Redis 이벤트 유실 시 최대 5분 내에 복구됩니다.</p>
     */
    @Scheduled(fixedDelay = 5 * 60 * 1000L)
    @Transactional
    public void releaseExpiredHolds() {
        Instant expiredBefore = Instant.now()
                .minus(HOLD_MINUTES + EXPIRY_BUFFER_MINUTES, ChronoUnit.MINUTES);

        List<SessionSeat> expiredSeats = sessionSeatRepository.findExpiredHeldSeats(expiredBefore);

        if (expiredSeats.isEmpty()) {
            return;
        }

        log.warn("[선점 만료 폴백] Redis 이벤트 미수신 좌석 {}개 감지 — DB 직접 복구", expiredSeats.size());

        // 회차별로 그룹핑하여 WebSocket 이벤트를 최소화한다.
        Map<Long, List<SessionSeat>> bySession = expiredSeats.stream()
                .collect(Collectors.groupingBy(ss -> ss.getSession().getId()));

        expiredSeats.forEach(SessionSeat::release);
        sessionSeatRepository.saveAll(expiredSeats);

        bySession.forEach((scheduleId, seats) -> {
            List<Long> seatIds = seats.stream().map(SessionSeat::getId).toList();
            // Redis 키도 정리 (이미 만료됐을 수 있지만 idempotent)
            seats.stream()
                    .map(SessionSeat::getHeldByUserId)
                    .distinct()
                    .forEach(userId -> seatHoldKeyStore.deleteHeld(scheduleId, userId));

            eventPublisher.publishEvent(
                    new SeatStatusChangedEvent(this, scheduleId, seatIds, SessionSeat.SaleStatus.AVAILABLE)
            );
            log.info("[선점 만료 폴백] scheduleId={} seats={} 복구 완료", scheduleId, seatIds);
        });
    }
}
