package com.ssafy.tickle.event.infrastructure.cache.store;

import com.ssafy.tickle.event.config.EventConstants;
import com.ssafy.tickle.event.infrastructure.cache.model.CachedCategoryRankingResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.serializer.SerializationException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * 이벤트 랭킹 캐시를 Redis에 저장하고 조회합니다.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class EventRankingCacheStore {

    private final RedisTemplate<String, CachedCategoryRankingResponse> eventRankingRedisTemplate;

    public Optional<CachedCategoryRankingResponse> findByCategoryId(Long categoryId) {
        String cacheKey = key(categoryId);

        try {
            return Optional.ofNullable(eventRankingRedisTemplate.opsForValue().get(cacheKey));
        } catch (SerializationException exception) {
            log.warn("이벤트 랭킹 캐시 역직렬화에 실패했습니다. cacheKey={}", cacheKey, exception);
            deleteQuietly(cacheKey);
            return Optional.empty();
        } catch (DataAccessException exception) {
            log.warn("이벤트 랭킹 캐시 조회에 실패했습니다. cacheKey={}", cacheKey, exception);
            return Optional.empty();
        }
    }

    public void save(Long categoryId, CachedCategoryRankingResponse response) {
        String cacheKey = key(categoryId);

        try {
            eventRankingRedisTemplate.opsForValue().set(
                    cacheKey,
                    response,
                    EventConstants.EVENT_RANKING_CACHE_TTL
            );
        } catch (SerializationException exception) {
            log.warn("이벤트 랭킹 캐시 직렬화에 실패했습니다. cacheKey={}", cacheKey, exception);
        } catch (DataAccessException exception) {
            log.warn("이벤트 랭킹 캐시 저장에 실패했습니다. cacheKey={}", cacheKey, exception);
        }
    }

    private String key(Long categoryId) {
        return EventConstants.EVENT_RANKING_CACHE_KEY_PREFIX + (categoryId == null ? "ALL" : categoryId);
    }

    private void deleteQuietly(String cacheKey) {
        try {
            eventRankingRedisTemplate.delete(cacheKey);
        } catch (DataAccessException exception) {
            log.warn("이벤트 랭킹 캐시 삭제에 실패했습니다. cacheKey={}", cacheKey, exception);
        }
    }
}
