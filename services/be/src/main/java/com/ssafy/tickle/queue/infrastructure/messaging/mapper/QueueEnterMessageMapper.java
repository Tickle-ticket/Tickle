package com.ssafy.tickle.queue.infrastructure.messaging.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.tickle.queue.infrastructure.messaging.model.QueueEnterMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * QueueEnterMessage와 Kafka payload 간 변환을 담당합니다.
 */
@Component
@RequiredArgsConstructor
public class QueueEnterMessageMapper {

    private final ObjectMapper objectMapper;

    public String toPayload(QueueEnterMessage message) {
        try {
            return objectMapper.writeValueAsString(message);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("대기열 진입 요청 직렬화에 실패했습니다.", exception);
        }
    }
}
