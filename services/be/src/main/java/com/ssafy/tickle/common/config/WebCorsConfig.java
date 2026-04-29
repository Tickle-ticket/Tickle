package com.ssafy.tickle.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 프론트엔드와의 교차 출처 요청을 허용하는 전역 CORS 설정 클래스입니다.
 */
@Configuration
public class WebCorsConfig implements WebMvcConfigurer {

    private final String feOrigin;

    public WebCorsConfig(@Value("${cors.fe-origin}") String feOrigin) {
        this.feOrigin = feOrigin;
    }

    /**
     * 전역 CORS 매핑을 등록합니다.
     *
     * <p>설정 파일에 등록된 프론트엔드 출처에서 들어오는 API 요청을 허용합니다.</p>
     *
     * @param registry CORS 매핑 레지스트리
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns(
                        "http://localhost:3000",
                        "http://127.0.0.1:3000",
                        feOrigin
                )
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
