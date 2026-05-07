package com.ssafy.tickle.common.config;

import com.ssafy.tickle.common.auth.UserIdArgumentResolver;
import com.ssafy.tickle.common.interceptor.AdminAuthInterceptor;
import com.ssafy.tickle.common.interceptor.BlacklistInterceptor;
import com.ssafy.tickle.common.interceptor.InternalSecretInterceptor;
import com.ssafy.tickle.common.interceptor.IpRateLimitInterceptor;
import com.ssafy.tickle.common.interceptor.SuspiciousPatternInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

/**
 * Spring MVC 설정 클래스입니다.
 *
 * <ul>
 *   <li>/internal/** — InternalSecretInterceptor: 내부 API 시크릿 키 검증</li>
 *   <li>/api/v1/events/&#42;&#42;/seats/&#42;&#42;, /api/v1/queue/&#42;&#42;, /api/v1/reservations/&#42;&#42; — BlacklistInterceptor: 블랙리스트 사용자 차단</li>
 *   <li>/api/v1/events/&#42;&#42;/seats/&#42;&#42;, /api/v1/queue/&#42;&#42;, /api/v1/reservations/&#42;&#42; — IpRateLimitInterceptor: IP별 요청 속도 제한 탐지</li>
 *   <li>/api/v1/events/&#42;&#42;/seats/&#42;&#42;, /api/v1/queue/&#42;&#42;, /api/v1/reservations/&#42;&#42; — SuspiciousPatternInterceptor: 의심 패턴 탐지</li>
 *   <li>/api/v1/admin/** — AdminAuthInterceptor: 관리자 권한 검증</li>
 * </ul>
 */
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final InternalSecretInterceptor internalSecretInterceptor;
    private final BlacklistInterceptor blacklistInterceptor;
    private final IpRateLimitInterceptor ipRateLimitInterceptor;
    private final SuspiciousPatternInterceptor suspiciousPatternInterceptor;
    private final AdminAuthInterceptor adminAuthInterceptor;
    private final UserIdArgumentResolver userIdArgumentResolver;

    /**
     * 인터셉터를 경로별로 등록합니다.
     *
     * @param registry 인터셉터 레지스트리
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(internalSecretInterceptor)
                .addPathPatterns(
                        "/internal/**",
                        "/api/v1/cancellations/*/notify"
                );

        registry.addInterceptor(blacklistInterceptor)
                .addPathPatterns(
                        "/api/v1/events/**/seats/**",
                        "/api/v1/queue/**",
                        "/api/v1/reservations/**"
                );

        registry.addInterceptor(ipRateLimitInterceptor)
                .addPathPatterns(
                        "/api/v1/events/**/seats/**",
                        "/api/v1/queue/**",
                        "/api/v1/reservations/**"
                );

        registry.addInterceptor(suspiciousPatternInterceptor)
                .addPathPatterns(
                        "/api/v1/events/**/seats/**",
                        "/api/v1/queue/**",
                        "/api/v1/reservations/**"
                );

        registry.addInterceptor(adminAuthInterceptor)
                .addPathPatterns("/api/v1/admin/**");
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(userIdArgumentResolver);
    }
}
