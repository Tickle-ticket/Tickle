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

    /**
     * sentinel.master가 설정되어 있으면 Sentinel 모드, 없으면 Single Server 모드로 동작합니다.
     *
     * <p>운영: sentinel 모드 / 로컬·테스트: single server 모드</p>
     */
    @Bean(destroyMethod = "shutdown")
    public RedissonClient redissonClient(
            @Value("${spring.data.redis.sentinel.master:}") String masterName,
            @Value("${spring.data.redis.sentinel.nodes:}") String sentinelNodes,
            @Value("${spring.data.redis.host:localhost}") String host,
            @Value("${spring.data.redis.port:6379}") int port,
            @Value("${spring.data.redis.password:}") String password
    ) {
        Config config = new Config();

        if (masterName != null && !masterName.isBlank()) {
            SentinelServersConfig sentinelConfig = config.useSentinelServers()
                    .setMasterName(masterName)
                    .addSentinelAddress(
                            Arrays.stream(sentinelNodes.split(","))
                                    .map(node -> "redis://" + node.trim())
                                    .toArray(String[]::new)
                    )
                    .setReadMode(ReadMode.MASTER)
                    .setConnectTimeout(1000)
                    .setTimeout(1000)
                    .setRetryAttempts(1)
                    .setRetryInterval(200)
                    .setCheckLockSyncedSlaves(false);

            if (password != null && !password.isBlank()) {
                sentinelConfig.setPassword(password);
            }
        } else {
            var singleConfig = config.useSingleServer()
                    .setAddress("redis://" + host + ":" + port);

            if (password != null && !password.isBlank()) {
                singleConfig.setPassword(password);
            }
        }

        return Redisson.create(config);
    }
}
