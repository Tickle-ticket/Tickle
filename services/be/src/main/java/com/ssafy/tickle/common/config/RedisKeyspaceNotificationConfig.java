package com.ssafy.tickle.common.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;

/**
 * Redis Keyspace Notification 리스너 컨테이너 설정입니다.
 *
 * <p>Redis에서 {@code held:{scheduleId}:{userId}} 키가 만료되면
 * {@code __keyevent@*__:expired} 채널에 이벤트가 발행됩니다.
 * 이를 {@code SeatHoldExpiredListener}가 수신하여 자동 해제를 처리합니다.</p>
 *
 * <p>{@link #enableKeyspaceNotifications()} 메서드가 기동 시 Redis에
 * {@code CONFIG SET notify-keyspace-events Ex}를 실행하여 알림을 활성화합니다.</p>
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class RedisKeyspaceNotificationConfig {

    private final RedisConnectionFactory redisConnectionFactory;

    /**
     * 애플리케이션 기동 시 Redis Keyspace Notification을 활성화합니다.
     *
     * <p>{@code Ex} 옵션:
     * <ul>
     *   <li>E — Keyevent 이벤트 (특정 키에 발생한 이벤트를 채널로 전달)</li>
     *   <li>x — expired 이벤트 (TTL 만료 시 발행)</li>
     * </ul>
     * </p>
     *
     * <p>이 설정이 없으면 TTL 만료 이벤트가 발행되지 않아
     * 좌석 선점 15분 자동 해제가 동작하지 않습니다.</p>
     */
    @PostConstruct
    public void enableKeyspaceNotifications() {
        try (var connection = redisConnectionFactory.getConnection()) {
            connection.serverCommands().setConfig("notify-keyspace-events", "Ex");
            log.info("[Redis] Keyspace Notification 활성화 완료 (notify-keyspace-events=Ex)");
        } catch (Exception e) {
            log.warn("[Redis] Keyspace Notification 활성화 실패 — TTL 자동 해제 비활성화됨: {}", e.getMessage());
        }
    }

    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(
            MessageListenerAdapter seatHoldExpiredListenerAdapter
    ) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(redisConnectionFactory);

        // 모든 DB의 expired 이벤트 구독
        container.addMessageListener(
                seatHoldExpiredListenerAdapter,
                new PatternTopic("__keyevent@*__:expired")
        );

        return container;
    }

    @Bean
    public MessageListenerAdapter seatHoldExpiredListenerAdapter(
            com.ssafy.tickle.seat.infrastructure.redis.SeatHoldExpiredListener listener
    ) {
        // onMessage(Message, byte[])를 직접 구현하므로 delegate method 지정 불필요
        return new MessageListenerAdapter(listener);
    }
}
