package com.ssafy.tickle.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.tickle.event.presentation.dto.CategoryRankingResponse;
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
    public RedisTemplate<String, CategoryRankingResponse> eventRankingRedisTemplate(
            RedisConnectionFactory redisConnectionFactory,
            ObjectMapper objectMapper
    ) {
        RedisTemplate<String, CategoryRankingResponse> redisTemplate = new RedisTemplate<>();
        redisTemplate.setConnectionFactory(redisConnectionFactory);
        redisTemplate.setKeySerializer(new StringRedisSerializer());
        redisTemplate.setValueSerializer(
                new Jackson2JsonRedisSerializer<>(objectMapper, CategoryRankingResponse.class)
        );
        redisTemplate.afterPropertiesSet();
        return redisTemplate;
    }
}
