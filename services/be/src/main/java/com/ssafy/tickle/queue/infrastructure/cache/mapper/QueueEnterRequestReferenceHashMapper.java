package com.ssafy.tickle.queue.infrastructure.cache.mapper;

import com.ssafy.tickle.queue.domain.QueueScope;
import com.ssafy.tickle.queue.infrastructure.cache.model.QueueEnterRequestReference;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;

/**
 * QueueEnterRequestReference와 Redis hash 간 변환을 담당합니다.
 */
@Component
public class QueueEnterRequestReferenceHashMapper {

    private static final String SCOPE = "scope";
    private static final String SESSION_ID = "sessionId";
    private static final String USER_ID = "userId";

    public Map<String, String> toHash(QueueScope scope, Long sessionId, Long userId) {
        return Map.of(
                SCOPE, scope.name(),
                SESSION_ID, String.valueOf(sessionId),
                USER_ID, String.valueOf(userId)
        );
    }

    public Optional<QueueEnterRequestReference> fromHash(Map<Object, Object> entries) {
        Object scope = entries.get(SCOPE);
        Object sessionId = entries.get(SESSION_ID);
        Object userId = entries.get(USER_ID);
        if (sessionId == null || userId == null) {
            return Optional.empty();
        }

        return Optional.of(new QueueEnterRequestReference(
                scope == null ? QueueScope.BOOKING : QueueScope.valueOf(scope.toString()),
                Long.parseLong(sessionId.toString()),
                Long.parseLong(userId.toString())
        ));
    }
}
