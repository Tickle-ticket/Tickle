package com.ssafy.tickle.common.config;

import net.nurigo.sdk.NurigoApp;
import net.nurigo.sdk.message.service.DefaultMessageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * CoolSMS 문자 발송 서비스 설정 클래스입니다.
 */
@Configuration
public class CoolSmsConfig {

    @Value("${coolsms.api-key}")
    private String apiKey;

    @Value("${coolsms.api-secret}")
    private String apiSecret;

    /**
     * CoolSMS DefaultMessageService Bean을 생성합니다.
     *
     * @return DefaultMessageService
     */
    @Bean
    public DefaultMessageService defaultMessageService() {
        return NurigoApp.INSTANCE.initialize(apiKey, apiSecret, "https://api.coolsms.co.kr");
    }
}
