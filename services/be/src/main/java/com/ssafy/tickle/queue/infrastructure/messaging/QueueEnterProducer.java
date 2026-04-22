package com.ssafy.tickle.queue.infrastructure.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.tickle.queue.infrastructure.messaging.model.QueueEnterMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.ExecutionException;

/**
 * Kafka로 대기열 진입 요청 메시지를 발행합니다.
 */
@Component
@RequiredArgsConstructor
public class QueueEnterProducer {

    private static final String TOPIC = "queue.enter-request";

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public void publish(QueueEnterMessage command) {
        try {
            kafkaTemplate.send(TOPIC, command.sessionId().toString(), objectMapper.writeValueAsString(command)).get();
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("대기열 진입 요청 직렬화에 실패했습니다.", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("대기열 진입 요청 Kafka 적재가 인터럽트되었습니다.", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("대기열 진입 요청 Kafka 적재에 실패했습니다.", exception);
        }
    }
}
