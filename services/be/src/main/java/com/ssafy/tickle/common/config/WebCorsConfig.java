package com.ssafy.tickle.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
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
    private final Environment env;

    public WebCorsConfig(@Value("${cors.fe-origin:http://localhost:3000}") String feOrigin, Environment env) {
        this.feOrigin = feOrigin;
        this.env = env;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // 자주 사용되는 로컬 개발 포트 추가 (3000, 5173, 5174, 8080, 3001)
        List<String> allowedOrigins = new ArrayList<>(Arrays.asList(
                "http://localhost:3000", "http://127.0.0.1:3000",
                "http://localhost:5173", "http://127.0.0.1:5173",
                "http://localhost:5174", "http://127.0.0.1:5174",
                "http://localhost:8080", "http://127.0.0.1:8080",
                "http://localhost:3001", "http://127.0.0.1:3001",
                feOrigin
        ));

        // 환경변수(ALLOW_ALL_ORIGINS)로 강제 허용 여부 확인
        boolean allowAll = Boolean.parseBoolean(env.getProperty("cors.allow-all-origins", "false"));
        boolean isLocalOrDev = Arrays.stream(env.getActiveProfiles())
                .anyMatch(profile -> profile.equalsIgnoreCase("local") || profile.equalsIgnoreCase("dev"));
        
        if (isLocalOrDev || allowAll) {
            registry.addMapping("/**") // /api 뿐만 아니라 모든 경로 허용
                    .allowedOriginPatterns("*")
                    .allowedMethods("*")
                    .allowedHeaders("*")
                    .allowCredentials(true)
                    .maxAge(3600);
        } else {
            registry.addMapping("/api/**")
                    .allowedOriginPatterns(allowedOrigins.toArray(new String[0]))
                    .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                    .allowedHeaders("*")
                    .allowCredentials(true)
                    .maxAge(3600);
        }
    }
}
