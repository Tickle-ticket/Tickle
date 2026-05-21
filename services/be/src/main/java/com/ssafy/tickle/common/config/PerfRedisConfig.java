package com.ssafy.tickle.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;

/**
 * 성능 테스트(perf 프로파일) 전용 Redis 설정.
 *
 * <p>운영 환경은 Redis Sentinel을 사용하지만, 로컬 성능 테스트 시에는
 * standalone Redis(localhost:6379)를 사용한다. Spring Boot 자동 설정의
 * {@code @ConditionalOnMissingBean(RedisConnectionFactory.class)}보다
 * 이 Bean이 먼저 등록되므로 Sentinel 자동 설정이 건너뛰어진다.</p>
 */
@Configuration
@Profile("perf")
public class PerfRedisConfig {

    /**
     * standalone Redis 연결 팩토리를 생성합니다.
     * Spring Boot Redis 자동 설정을 대체합니다.
     */
    @Bean
    public RedisConnectionFactory redisConnectionFactory(
            @Value("${spring.data.redis.host:localhost}") String host,
            @Value("${spring.data.redis.port:6379}") int port
    ) {
        return new LettuceConnectionFactory(new RedisStandaloneConfiguration(host, port));
    }
}
