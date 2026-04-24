package com.ssafy.tickle.event.infrastructure.cache.store;

import com.ssafy.tickle.event.config.EventConstants;
import com.ssafy.tickle.event.presentation.dto.OpeningSoonEventsResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.SerializationException;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * 오픈 임박 공연 캐시를 Redis에 저장하고 조회합니다.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class OpeningSoonEventCacheStore {

    private final RedisTemplate<String, OpeningSoonEventsResponse> openingSoonEventsRedisTemplate;

    public Optional<OpeningSoonEventsResponse> find() {
        String cacheKey = EventConstants.EVENT_OPENING_SOON_CACHE_KEY;

        try {
            return Optional.ofNullable(openingSoonEventsRedisTemplate.opsForValue().get(cacheKey));
        } catch (SerializationException exception) {
            log.warn("오픈 임박 공연 캐시 역직렬화에 실패했습니다. cacheKey={}", cacheKey, exception);
            deleteQuietly(cacheKey);
            return Optional.empty();
        } catch (DataAccessException exception) {
            log.warn("오픈 임박 공연 캐시 조회에 실패했습니다. cacheKey={}", cacheKey, exception);
            return Optional.empty();
        }
    }

    public void save(OpeningSoonEventsResponse response) {
        String cacheKey = EventConstants.EVENT_OPENING_SOON_CACHE_KEY;

        try {
            openingSoonEventsRedisTemplate.opsForValue().set(
                    cacheKey,
                    response,
                    EventConstants.EVENT_OPENING_SOON_CACHE_TTL
            );
        } catch (SerializationException exception) {
            log.warn("오픈 임박 공연 캐시 직렬화에 실패했습니다. cacheKey={}", cacheKey, exception);
        } catch (DataAccessException exception) {
            log.warn("오픈 임박 공연 캐시 저장에 실패했습니다. cacheKey={}", cacheKey, exception);
        }
    }

    private void deleteQuietly(String cacheKey) {
        try {
            openingSoonEventsRedisTemplate.delete(cacheKey);
        } catch (DataAccessException exception) {
            log.warn("오픈 임박 공연 캐시 삭제에 실패했습니다. cacheKey={}", cacheKey, exception);
        }
    }
}
