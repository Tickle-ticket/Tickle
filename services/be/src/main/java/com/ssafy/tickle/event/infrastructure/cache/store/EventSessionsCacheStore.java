package com.ssafy.tickle.event.infrastructure.cache.store;

import com.ssafy.tickle.event.config.EventConstants;
import com.ssafy.tickle.event.infrastructure.cache.model.CachedEventSessionsResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.SerializationException;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/**
 * 공연별 회차 목록 캐시를 Redis에 저장하고 조회합니다.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class EventSessionsCacheStore {

    private final RedisTemplate<String, CachedEventSessionsResponse> eventSessionsRedisTemplate;

    public Optional<CachedEventSessionsResponse> findByEventId(Long eventId) {
        String cacheKey = key(eventId);

        try {
            return Optional.ofNullable(eventSessionsRedisTemplate.opsForValue().get(cacheKey));
        } catch (SerializationException exception) {
            log.warn("공연 회차 목록 캐시 역직렬화에 실패했습니다. cacheKey={}", cacheKey, exception);
            deleteQuietly(cacheKey);
            return Optional.empty();
        } catch (DataAccessException exception) {
            log.warn("공연 회차 목록 캐시 조회에 실패했습니다. cacheKey={}", cacheKey, exception);
            return Optional.empty();
        }
    }

    public void save(Long eventId, CachedEventSessionsResponse response, Instant salesEndAt) {
        String cacheKey = key(eventId);
        Instant now = Instant.now();
        if (!salesEndAt.isAfter(now)) {
            return;
        }

        try {
            eventSessionsRedisTemplate.opsForValue().set(
                    cacheKey,
                    response,
                    Duration.between(now, salesEndAt)
            );
        } catch (SerializationException exception) {
            log.warn("공연 회차 목록 캐시 직렬화에 실패했습니다. cacheKey={}", cacheKey, exception);
        } catch (DataAccessException exception) {
            log.warn("공연 회차 목록 캐시 저장에 실패했습니다. cacheKey={}", cacheKey, exception);
        }
    }

    private String key(Long eventId) {
        return EventConstants.EVENT_SESSIONS_CACHE_KEY_PREFIX + eventId;
    }

    private void deleteQuietly(String cacheKey) {
        try {
            eventSessionsRedisTemplate.delete(cacheKey);
        } catch (DataAccessException exception) {
            log.warn("공연 회차 목록 캐시 삭제에 실패했습니다. cacheKey={}", cacheKey, exception);
        }
    }
}
