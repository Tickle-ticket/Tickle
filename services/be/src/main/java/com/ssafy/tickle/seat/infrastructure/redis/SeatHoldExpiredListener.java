package com.ssafy.tickle.seat.infrastructure.redis;

import com.ssafy.tickle.seat.application.SeatHoldExpiredHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

/**
 * Redis Keyspace Notification의 키 만료 이벤트를 수신하는 리스너입니다.
 *
 * <p>{@code __keyevent@*__:expired} 채널을 구독하여 모든 만료 이벤트를 수신하고,
 * {@code held:{scheduleId}:{userId}} 패턴의 키만 필터링하여
 * {@link SeatHoldExpiredHandler}에 위임합니다.</p>
 *
 * <p>Redis Keyspace Notification 활성화 필요:
 * {@code CONFIG SET notify-keyspace-events Ex}</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SeatHoldExpiredListener implements MessageListener {

    private static final String KEY_PREFIX = "held:";

    private final SeatHoldExpiredHandler seatHoldExpiredHandler;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String expiredKey = message.toString();

        if (!expiredKey.startsWith(KEY_PREFIX)) {
            return; // 다른 키 만료 이벤트 무시
        }

        // held:{scheduleId}:{userId} 파싱
        String[] parts = expiredKey.split(":");
        if (parts.length != 3) {
            log.warn("[TTL 만료] 예상치 못한 키 형식: {}", expiredKey);
            return;
        }

        try {
            Long scheduleId = Long.parseLong(parts[1]);
            Long userId = Long.parseLong(parts[2]);
            log.debug("[TTL 만료] 이벤트 수신 — key={} scheduleId={} userId={}", expiredKey, scheduleId, userId);
            seatHoldExpiredHandler.handle(scheduleId, userId);
        } catch (NumberFormatException e) {
            log.warn("[TTL 만료] 키 파싱 실패: {}", expiredKey, e);
        }
    }
}
