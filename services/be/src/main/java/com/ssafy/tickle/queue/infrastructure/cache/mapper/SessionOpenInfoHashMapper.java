package com.ssafy.tickle.queue.infrastructure.cache.mapper;

import com.ssafy.tickle.queue.infrastructure.cache.model.SessionOpenInfo;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

/**
 * SessionOpenInfo와 Redis hash 간 변환을 담당합니다.
 */
@Component
public class SessionOpenInfoHashMapper {

    private static final String SALES_OPEN_AT = "salesOpenAt";
    private static final String SALES_CLOSE_AT = "salesCloseAt";

    public Map<String, String> toHash(SessionOpenInfo info) {
        return Map.of(
                SALES_OPEN_AT, info.salesOpenAt().toString(),
                SALES_CLOSE_AT, info.salesCloseAt().toString()
        );
    }

    public Optional<SessionOpenInfo> fromHash(Long sessionId, Map<Object, Object> entries) {
        Object salesOpenAt = entries.get(SALES_OPEN_AT);
        Object salesCloseAt = entries.get(SALES_CLOSE_AT);
        if (salesOpenAt == null || salesCloseAt == null) {
            return Optional.empty();
        }

        return Optional.of(new SessionOpenInfo(
                sessionId,
                Instant.parse(salesOpenAt.toString()),
                Instant.parse(salesCloseAt.toString())
        ));
    }
}
