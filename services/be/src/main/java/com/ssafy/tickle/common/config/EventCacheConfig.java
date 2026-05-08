package com.ssafy.tickle.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.tickle.event.infrastructure.cache.model.CachedCategoryRankingResponse;
import com.ssafy.tickle.event.infrastructure.cache.model.CachedEventSessionsResponse;
import com.ssafy.tickle.event.infrastructure.cache.model.CachedOpeningSoonEventsResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * event 도메인 캐시용 RedisTemplate 설정입니다.
 */
@Configuration
public class EventCacheConfig {

    @Bean
    public RedisTemplate<String, CachedCategoryRankingResponse> eventRankingRedisTemplate(
            RedisConnectionFactory redisConnectionFactory,
            ObjectMapper objectMapper
    ) {
        RedisTemplate<String, CachedCategoryRankingResponse> redisTemplate = new RedisTemplate<>();
        redisTemplate.setConnectionFactory(redisConnectionFactory);
        redisTemplate.setKeySerializer(new StringRedisSerializer());
        redisTemplate.setValueSerializer(
                new Jackson2JsonRedisSerializer<>(objectMapper, CachedCategoryRankingResponse.class)
        );
        redisTemplate.afterPropertiesSet();
        return redisTemplate;
    }

    @Bean
    public RedisTemplate<String, CachedOpeningSoonEventsResponse> openingSoonEventsRedisTemplate(
            RedisConnectionFactory redisConnectionFactory,
            ObjectMapper objectMapper
    ) {
        RedisTemplate<String, CachedOpeningSoonEventsResponse> redisTemplate = new RedisTemplate<>();
        redisTemplate.setConnectionFactory(redisConnectionFactory);
        redisTemplate.setKeySerializer(new StringRedisSerializer());
        redisTemplate.setValueSerializer(
                new Jackson2JsonRedisSerializer<>(objectMapper, CachedOpeningSoonEventsResponse.class)
        );
        redisTemplate.afterPropertiesSet();
        return redisTemplate;
    }

    @Bean
    public RedisTemplate<String, CachedEventSessionsResponse> eventSessionsRedisTemplate(
            RedisConnectionFactory redisConnectionFactory,
            ObjectMapper objectMapper
    ) {
        RedisTemplate<String, CachedEventSessionsResponse> redisTemplate = new RedisTemplate<>();
        redisTemplate.setConnectionFactory(redisConnectionFactory);
        redisTemplate.setKeySerializer(new StringRedisSerializer());
        redisTemplate.setValueSerializer(
                new Jackson2JsonRedisSerializer<>(objectMapper, CachedEventSessionsResponse.class)
        );
        redisTemplate.afterPropertiesSet();
        return redisTemplate;
    }
}
