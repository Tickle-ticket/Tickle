package com.tickle.ingest.producer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tickle.ingest.dto.BehaviorEventRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Component;

@Component
public class BehaviorEventProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final String behaviorEventsTopic;

    public BehaviorEventProducer(
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper,
            @Value("${app.kafka.topics.behavior-events}") String behaviorEventsTopic
    ) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.behaviorEventsTopic = behaviorEventsTopic;
    }

    public void send(
            BehaviorEventRequest request,
            String accessToken,
            String internalSecret,
            String requestId
    ) {
        try {
            String payload = objectMapper.writeValueAsString(request);
            String key = buildKey(request);

            MessageBuilder<String> messageBuilder = MessageBuilder
                    .withPayload(payload)
                    .setHeader(KafkaHeaders.TOPIC, behaviorEventsTopic)
                    .setHeader(KafkaHeaders.KEY, key)
                    .setHeader("access-token", accessToken);

            if (internalSecret != null && !internalSecret.isBlank()) {
                messageBuilder.setHeader("X-Internal-Secret", internalSecret);
            }

            if (requestId != null && !requestId.isBlank()) {
                messageBuilder.setHeader("X-Request-Id", requestId);
            }

            kafkaTemplate.send(messageBuilder.build());
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to serialize behavior event request", e);
        }
    }

    private String buildKey(BehaviorEventRequest request) {
        String scheduleId = request.scheduleId() != null ? request.scheduleId().toString() : "null";
        String eventId = request.eventId() != null ? request.eventId().toString() : "null";
        return request.type() + ":" + scheduleId + ":" + eventId + ":" + request.createdAt();
    }
}
