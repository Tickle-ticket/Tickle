package com.ssafy.tickle.auth.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * BE 서버 내부 통신용 RestClient 설정 클래스입니다.
 */
@Configuration
public class RestClientConfig {

    @Value("${internal.be.url}")
    private String beInternalUrl;

    /**
     * BE 서버 내부 API 호출용 RestClient를 생성합니다.
     *
     * @return BE internal RestClient
     */
    @Bean
    public RestClient beRestClient() {
        return RestClient.builder()
                .baseUrl(beInternalUrl)
                .build();
    }
}
