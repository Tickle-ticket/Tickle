package com.ssafy.tickle.queue.infrastructure.messaging;

import com.ssafy.tickle.queue.infrastructure.messaging.mapper.QueueEnterMessageMapper;
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
    private final QueueEnterMessageMapper queueEnterMessageMapper;

    public void publish(QueueEnterMessage message) {
        try {
            // send().get()으로 브로커 ack까지 확인해야 enter API가 적재 실패를 감지할 수 있다.
            kafkaTemplate.send(
                    TOPIC,
                    message.sessionId().toString(),
                    queueEnterMessageMapper.toPayload(message)
            ).get();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("대기열 진입 요청 Kafka 적재가 인터럽트되었습니다.", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("대기열 진입 요청 Kafka 적재에 실패했습니다.", exception);
        }
    }
}
