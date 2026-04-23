package com.ssafy.tickle.queue.infrastructure.cache.mapper;

import com.ssafy.tickle.queue.domain.QueueRequestStatus;
import com.ssafy.tickle.queue.infrastructure.cache.model.QueueStatusSnapshot;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

/**
 * QueueStatusSnapshot과 Redis hash 간 변환을 담당합니다.
 */
@Component
public class QueueStatusHashMapper {

    private static final String REQUEST_ID = "requestId";
    private static final String USER_ID = "userId";
    private static final String SESSION_ID = "sessionId";
    private static final String STATUS = "status";
    private static final String REGISTERED_AT = "registeredAt";
    private static final String ADMIT_TOKEN = "admitToken";
    private static final String ADMITTED_AT = "admittedAt";

    public Map<String, String> toHash(
            String requestId,
            Long userId,
            Long sessionId,
            QueueRequestStatus status,
            Instant registeredAt
    ) {
        return Map.of(
                REQUEST_ID, requestId,
                USER_ID, String.valueOf(userId),
                SESSION_ID, String.valueOf(sessionId),
                STATUS, status.name(),
                REGISTERED_AT, String.valueOf(registeredAt.toEpochMilli())
        );
    }

    public Map<String, String> toAdmittedFields(String admitToken, Instant admittedAt) {
        return Map.of(
                STATUS, QueueRequestStatus.ADMITTED.name(),
                ADMIT_TOKEN, admitToken,
                ADMITTED_AT, String.valueOf(admittedAt.toEpochMilli())
        );
    }

    public Map<String, String> toTerminalStatusFields(QueueRequestStatus status) {
        return Map.of(
                STATUS, status.name()
        );
    }

    public Optional<QueueStatusSnapshot> fromHash(String queueToken, Map<Object, Object> entries) {
        Object requestId = entries.get(REQUEST_ID);
        Object userId = entries.get(USER_ID);
        Object sessionId = entries.get(SESSION_ID);
        Object status = entries.get(STATUS);
        Object registeredAt = entries.get(REGISTERED_AT);
        if (requestId == null || userId == null || sessionId == null || status == null || registeredAt == null) {
            return Optional.empty();
        }

        Object admitToken = entries.get(ADMIT_TOKEN);
        Object admittedAt = entries.get(ADMITTED_AT);

        return Optional.of(new QueueStatusSnapshot(
                queueToken,
                requestId.toString(),
                Long.parseLong(userId.toString()),
                Long.parseLong(sessionId.toString()),
                QueueRequestStatus.valueOf(status.toString()),
                Instant.ofEpochMilli(Long.parseLong(registeredAt.toString())),
                admitToken == null ? null : admitToken.toString(),
                admittedAt == null ? null : Instant.ofEpochMilli(Long.parseLong(admittedAt.toString()))
        ));
    }
}
