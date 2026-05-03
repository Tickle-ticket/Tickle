package com.tickle.ingest.producer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tickle.ingest.dto.BehaviorEventRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
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

    public String topic() {
        return behaviorEventsTopic;
    }

    public void send(BehaviorEventRequest request) {
        try {
            String payload = objectMapper.writeValueAsString(request);
            String key = buildKey(request);

            kafkaTemplate.send(behaviorEventsTopic, key, payload);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to serialize behavior event request", e);
        }
    }

    private String buildKey(BehaviorEventRequest request) {
        return request.type() + ":" + request.scheduleId() + ":" + request.createdAt();
    }
}