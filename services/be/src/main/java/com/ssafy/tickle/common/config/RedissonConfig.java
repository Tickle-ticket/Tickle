package com.ssafy.tickle.common.config;

import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.redisson.config.ReadMode;
import org.redisson.config.SentinelServersConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;

@Configuration
public class RedissonConfig {

    /**
     * sentinel.master가 설정된 환경(운영)에서는 Sentinel 모드로 동작합니다.
     */
    @Bean(destroyMethod = "shutdown")
    @ConditionalOnProperty("spring.data.redis.sentinel.master")
    public RedissonClient redissonClientSentinel(
            @Value("${spring.data.redis.sentinel.master}") String masterName,
            @Value("${spring.data.redis.sentinel.nodes}") String sentinelNodes,
            @Value("${spring.data.redis.password:}") String password
    ) {
        Config config = new Config();

        String[] addresses = Arrays.stream(sentinelNodes.split(","))
                .map(node -> "redis://" + node.trim())
                .toArray(String[]::new);

        SentinelServersConfig sentinelConfig = config.useSentinelServers()
                .setMasterName(masterName)
                .addSentinelAddress(addresses)
                .setReadMode(ReadMode.MASTER);

        if (password != null && !password.isBlank()) {
            sentinelConfig.setPassword(password);
        }

        return Redisson.create(config);
    }

    /**
     * sentinel.master가 없는 환경(로컬/테스트)에서는 Single Server 모드로 동작합니다.
     */
    @Bean(destroyMethod = "shutdown")
    @ConditionalOnProperty(name = "spring.data.redis.sentinel.master", matchIfMissing = true, havingValue = "")
    public RedissonClient redissonClientSingle(
            @Value("${spring.data.redis.host:localhost}") String host,
            @Value("${spring.data.redis.port:6379}") int port,
            @Value("${spring.data.redis.password:}") String password
    ) {
        Config config = new Config();

        var singleConfig = config.useSingleServer()
                .setAddress("redis://" + host + ":" + port);

        if (password != null && !password.isBlank()) {
            singleConfig.setPassword(password);
        }

        return Redisson.create(config);
    }
}
