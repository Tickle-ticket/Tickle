package com.ssafy.tickle.common.config;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Jackson 관련 공용 설정입니다.
 */
@Configuration
public class JacksonConfig {

    /**
     * 애플리케이션 전역에서 사용할 ObjectMapper를 등록합니다.
     *
     * @return ObjectMapper 빈
     */
    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }
}
