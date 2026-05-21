package com.ssafy.tickle.reservation.infrastructure.messaging.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.tickle.reservation.infrastructure.messaging.model.BookingCancelMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * BookingCancelMessage와 Kafka payload 간 변환을 담당합니다.
 */
@Component
@RequiredArgsConstructor
public class BookingCancelMessageMapper {

    private final ObjectMapper objectMapper;

    /**
     * BookingCancelMessage를 JSON 문자열로 직렬화합니다.
     *
     * @param message 예매 취소 메시지
     * @return JSON 문자열
     */
    public String toPayload(BookingCancelMessage message) {
        try {
            return objectMapper.writeValueAsString(message);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("예매 취소 메시지 직렬화에 실패했습니다.", e);
        }
    }
}
