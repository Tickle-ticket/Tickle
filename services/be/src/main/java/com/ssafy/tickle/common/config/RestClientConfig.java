package com.ssafy.tickle.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * 외부 서버 통신용 RestClient 설정 클래스입니다.
 */
@Configuration
public class RestClientConfig {

    @Value("${internal.auth.url}")
    private String authInternalUrl;

    /**
     * Auth 서버 내부 API 호출용 RestClient를 생성합니다.
     *
     * @return Auth internal RestClient
     */
    @Bean
    public RestClient authRestClient() {
        return RestClient.builder()
                .baseUrl(authInternalUrl)
                .build();
    }
}
