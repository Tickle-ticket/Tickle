package com.ssafy.tickle.event.infrastructure.cache.store;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.tickle.event.config.EventConstants;
import com.ssafy.tickle.event.presentation.dto.CategoryRankingResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * 이벤트 랭킹 캐시를 Redis에 저장하고 조회합니다.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class EventRankingCacheStore {

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    public Optional<CategoryRankingResponse> findByCategoryId(Long categoryId) {
        String cacheKey = key(categoryId);

        try {
            String cachedValue = stringRedisTemplate.opsForValue().get(cacheKey);
            if (cachedValue == null || cachedValue.isBlank()) {
                return Optional.empty();
            }

            return Optional.of(objectMapper.readValue(cachedValue, CategoryRankingResponse.class));
        } catch (JsonProcessingException exception) {
            log.warn("이벤트 랭킹 캐시 역직렬화에 실패했습니다. cacheKey={}", cacheKey, exception);
            deleteQuietly(cacheKey);
            return Optional.empty();
        } catch (DataAccessException exception) {
            log.warn("이벤트 랭킹 캐시 조회에 실패했습니다. cacheKey={}", cacheKey, exception);
            return Optional.empty();
        }
    }

    public void save(Long categoryId, CategoryRankingResponse response) {
        String cacheKey = key(categoryId);

        try {
            String serializedValue = objectMapper.writeValueAsString(response);
            stringRedisTemplate.opsForValue().set(
                    cacheKey,
                    serializedValue,
                    EventConstants.EVENT_RANKING_CACHE_TTL
            );
        } catch (JsonProcessingException exception) {
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
            stringRedisTemplate.delete(cacheKey);
        } catch (DataAccessException exception) {
            log.warn("이벤트 랭킹 캐시 삭제에 실패했습니다. cacheKey={}", cacheKey, exception);
        }
    }
}
