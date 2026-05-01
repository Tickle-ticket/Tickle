package com.ssafy.tickle.auth.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Spring Security 설정 클래스입니다.
 *
 * <p>인증 서버는 자체적으로 JWT를 발급하는 역할을 하므로,
 * stateless 세션 정책을 적용하고 CSRF를 비활성화한다.</p>
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    /**
     * Security Filter Chain을 구성합니다.
     *
     * @param http HttpSecurity
     * @return SecurityFilterChain
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        // 인증 불필요 — 공개 엔드포인트
                        .requestMatchers(
                                "/api/v1/auth/signup",
                                "/api/v1/auth/login",
                                "/api/v1/auth/logout",
                                "/api/v1/auth/reissue",
                                "/api/v1/auth/phone/send",
                                "/api/v1/auth/phone/verify"
                        ).permitAll()
                        // 모니터링 / 문서
                        .requestMatchers(
                                "/actuator/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/api-docs/**"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .build();
    }

    /**
     * 비밀번호 암호화에 사용할 PasswordEncoder를 등록합니다.
     *
     * @return BCryptPasswordEncoder
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
