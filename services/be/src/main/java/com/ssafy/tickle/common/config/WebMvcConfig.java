package com.ssafy.tickle.common.config;

import com.ssafy.tickle.common.interceptor.AdminAuthInterceptor;
import com.ssafy.tickle.common.interceptor.BlacklistInterceptor;
import com.ssafy.tickle.common.interceptor.InternalSecretInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Spring MVC 설정 클래스입니다.
 *
 * <ul>
 *   <li>/internal/** — InternalSecretInterceptor: 내부 API 시크릿 키 검증</li>
 *   <li>/api/v1/events/&#42;&#42;/seats/&#42;&#42;, /api/v1/queue/&#42;&#42;, /api/v1/reservations/&#42;&#42; — BlacklistInterceptor: 블랙리스트 사용자 차단</li>
 *   <li>/api/v1/admin/** — AdminAuthInterceptor: 관리자 권한 검증</li>
 * </ul>
 */
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final InternalSecretInterceptor internalSecretInterceptor;
    private final BlacklistInterceptor blacklistInterceptor;
    private final AdminAuthInterceptor adminAuthInterceptor;

    /**
     * 인터셉터를 경로별로 등록합니다.
     *
     * @param registry 인터셉터 레지스트리
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(internalSecretInterceptor)
                .addPathPatterns("/internal/**");

        registry.addInterceptor(blacklistInterceptor)
                .addPathPatterns(
                        "/api/v1/events/**/seats/**",
                        "/api/v1/queue/**",
                        "/api/v1/reservations/**"
                );

        registry.addInterceptor(adminAuthInterceptor)
                .addPathPatterns("/api/v1/admin/**");
    }
}
