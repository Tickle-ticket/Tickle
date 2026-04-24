package com.ssafy.tickle.event.infrastructure.cache.store;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.tickle.event.config.EventConstants;
import com.ssafy.tickle.event.presentation.dto.CategoryRankingResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * 이벤트 랭킹 캐시를 Redis에 저장하고 조회합니다.
 */
@Component
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
        } catch (Exception exception) {
            stringRedisTemplate.delete(cacheKey);
            return Optional.empty();
        }
    }

    public void save(Long categoryId, CategoryRankingResponse response) {
        try {
            String serializedValue = objectMapper.writeValueAsString(response);
            stringRedisTemplate.opsForValue().set(
                    key(categoryId),
                    serializedValue,
                    EventConstants.EVENT_RANKING_CACHE_TTL
            );
        } catch (Exception exception) {
            // 캐시 저장 실패 시 조회 결과는 그대로 반환합니다.
        }
    }

    private String key(Long categoryId) {
        return EventConstants.EVENT_RANKING_CACHE_KEY_PREFIX + (categoryId == null ? "ALL" : categoryId);
    }
}
