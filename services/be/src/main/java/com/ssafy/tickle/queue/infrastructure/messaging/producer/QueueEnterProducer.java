package com.ssafy.tickle.queue.infrastructure.messaging.producer;

import com.ssafy.tickle.queue.config.QueueConstants;
import com.ssafy.tickle.queue.infrastructure.messaging.mapper.QueueEnterMessageMapper;
import com.ssafy.tickle.queue.infrastructure.messaging.model.QueueEnterMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/**
 * Kafka로 대기열 진입 요청 메시지를 발행합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class QueueEnterProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final QueueEnterMessageMapper queueEnterMessageMapper;

    /**
     * 대기열 진입 메시지를 비동기로 발행합니다.
     *
     * <p>기존 send().get() 동기 방식은 Virtual Thread 환경에서 Kafka 클라이언트 내부
     * synchronized 블록이 carrier thread를 pinning해 VT 성능 이점을 상쇄했다.
     * enter API는 멱등(idempotent)하므로 클라이언트가 실패 시 재시도할 수 있어
     * fire-and-forget 방식으로 전환한다. 적재 실패는 ERROR 로그로 추적한다.</p>
     */
    public void publish(QueueEnterMessage message) {
        kafkaTemplate.send(
                QueueConstants.ENTER_REQUEST_TOPIC,
                message.scope().name() + ":" + message.eventId(),
                queueEnterMessageMapper.toPayload(message)
        ).whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("대기열 진입 요청 Kafka 적재 실패. requestId={}, eventId={}",
                        message.requestId(), message.eventId(), ex);
            }
        });
    }
}
