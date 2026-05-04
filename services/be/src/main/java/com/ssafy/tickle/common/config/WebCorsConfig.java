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
        List<String> allowedOrigins = new ArrayList<>(Arrays.asList(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                feOrigin
        ));

        // 로컬 환경일 때 보안 정책을 대폭 완화 (로컬 파일 테스트용)
        boolean isLocalOrDev = Arrays.stream(env.getActiveProfiles())
                .anyMatch(profile -> profile.equalsIgnoreCase("local") || profile.equalsIgnoreCase("dev"));
        
        if (isLocalOrDev) {
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
