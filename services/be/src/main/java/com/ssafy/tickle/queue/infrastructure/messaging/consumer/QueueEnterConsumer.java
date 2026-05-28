package com.ssafy.tickle.queue.infrastructure.messaging.consumer;

import com.ssafy.tickle.queue.application.service.QueueStatusService;
import com.ssafy.tickle.queue.config.QueueConstants;
import com.ssafy.tickle.queue.infrastructure.messaging.mapper.QueueEnterMessageMapper;
import com.ssafy.tickle.queue.infrastructure.messaging.model.QueueEnterMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Kafka에 적재된 대기열 진입 요청을 소비해 실제 WAITING 등록을 처리합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class QueueEnterConsumer {

    private final QueueEnterMessageMapper queueEnterMessageMapper;
    private final QueueStatusService queueStatusService;

    @KafkaListener(topics = QueueConstants.ENTER_REQUEST_TOPIC)
    public void consume(String payload) {
        QueueEnterMessage message;
        try {
            message = queueEnterMessageMapper.fromPayload(payload);
        } catch (IllegalArgumentException exception) {
            log.warn("[QueueEnterConsumer] invalid queue enter payload. payload={}", payload, exception);
            return;
        }

        queueStatusService.registerWaiting(message);
    }
}
