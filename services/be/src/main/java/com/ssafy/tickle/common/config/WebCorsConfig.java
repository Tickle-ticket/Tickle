package com.ssafy.tickle.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.ArrayList;
import java.util.List;

/**
 * 프론트엔드와의 교차 출처 요청을 허용하는 전역 CORS 설정 클래스입니다.
 */
@Configuration
public class WebCorsConfig implements WebMvcConfigurer {

    private final String feOrigin;
    private final boolean allowAllOrigins;

    public WebCorsConfig(
            @Value("${cors.fe-origin}") String feOrigin,
            @Value("${cors.allow-all-origins:false}") boolean allowAllOrigins
    ) {
        this.feOrigin = feOrigin;
        this.allowAllOrigins = allowAllOrigins;
    }

    /**
     * 전역 CORS 매핑을 등록합니다.
     *
     * <p>설정 파일에 등록된 프론트엔드 출처에서 들어오는 API 요청을 허용합니다.</p>
     * <p>로컬 테스트용 명시적 설정(allow-all-origins: true)이 있는 경우에만 모든 출처(*)를 허용합니다.</p>
     *
     * @param registry CORS 매핑 레지스트리
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> allowedOrigins = new ArrayList<>(Arrays.asList(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                feOrigin
        ));

        // 로컬 테스트 도구를 위해 명시적으로 true인 경우에만 모든 출처(*) 허용
        if (allowAllOrigins) {
            allowedOrigins.add("*");
        }

        registry.addMapping("/api/**")
                .allowedOriginPatterns(allowedOrigins.toArray(new String[0]))
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
