package com.ssafy.tickle.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP over WebSocket 설정입니다.
 *
 * <p>FE는 {@code /ws} 엔드포인트에 SockJS로 연결하고,
 * {@code /topic/seats/{scheduleId}} 채널을 구독하여 실시간 좌석 상태를 수신합니다.</p>
 *
 * <pre>
 * 구독 예시: /topic/seats/1   (scheduleId = 1)
 * 메시지  : { sessionSeatId: 42, saleStatus: "HELD" }
 * </pre>
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // 서버 → 클라이언트 Push 채널 (simple in-memory broker)
        registry.enableSimpleBroker("/topic");
        // 클라이언트 → 서버 메시지 prefix (컨트롤러 @MessageMapping에서 사용)
        registry.setApplicationDestinationPrefixes("/app");
    }
}
