package com.ssafy.tickle.queue.infrastructure.cache.mapper;

import com.ssafy.tickle.queue.infrastructure.cache.model.EventOpenInfo;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

/**
 * EventOpenInfo와 Redis hash 간 변환을 담당합니다.
 */
@Component
public class EventOpenInfoHashMapper {

    private static final String SALES_START_AT = "salesStartAt";
    private static final String SALES_END_AT = "salesEndAt";

    public Map<String, String> toHash(EventOpenInfo info) {
        return Map.of(
                SALES_START_AT, info.salesStartAt().toString(),
                SALES_END_AT, info.salesEndAt().toString()
        );
    }

    public Optional<EventOpenInfo> fromHash(Long eventId, Map<Object, Object> entries) {
        Object salesStartAt = entries.get(SALES_START_AT);
        Object salesEndAt = entries.get(SALES_END_AT);
        if (salesStartAt == null || salesEndAt == null) {
            return Optional.empty();
        }

        return Optional.of(new EventOpenInfo(
                eventId,
                Instant.parse(salesStartAt.toString()),
                Instant.parse(salesEndAt.toString())
        ));
    }
}
