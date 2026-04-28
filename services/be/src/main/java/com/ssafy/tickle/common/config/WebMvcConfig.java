package com.ssafy.tickle.common.config;

import com.ssafy.tickle.common.interceptor.InternalSecretInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Spring MVC 설정 클래스입니다.
 *
 * <p>/internal/** 경로에 InternalSecretInterceptor를 등록하여
 * 내부 API에 대한 시크릿 키 검증을 적용합니다.</p>
 */
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final InternalSecretInterceptor internalSecretInterceptor;

    /**
     * /internal/** 경로에 X-Internal-Secret 헤더 검증 인터셉터를 등록합니다.
     *
     * @param registry 인터셉터 레지스트리
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(internalSecretInterceptor)
                .addPathPatterns("/internal/**");
    }
}
