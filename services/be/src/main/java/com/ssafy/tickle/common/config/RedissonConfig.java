package com.ssafy.tickle.common.config;

import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.redisson.config.ReadMode;
import org.redisson.config.SentinelServersConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;

@Configuration
public class RedissonConfig {

    @Bean(destroyMethod = "shutdown")
    public RedissonClient redissonClient(
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
}
