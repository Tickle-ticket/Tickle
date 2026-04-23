package com.ssafy.tickle.common.config;

import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.redisson.config.SingleServerConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RedissonConfig {

    @Bean(destroyMethod = "shutdown")
    public RedissonClient redissonClient(
            // 추후 application.yml 파일로 대체 가능
            @Value("${spring.data.redis.host}") String host,
            @Value("${spring.data.redis.port}") int port,
            @Value("${spring.data.redis.password:}") String password
    ) {
        Config config = new Config();

        SingleServerConfig singleServerConfig = config.useSingleServer()
                .setAddress("redis://" + host + ":" + port);

        if (password != null && !password.isBlank()) {
            singleServerConfig.setPassword(password);
        }

        return Redisson.create(config);
    }
}
