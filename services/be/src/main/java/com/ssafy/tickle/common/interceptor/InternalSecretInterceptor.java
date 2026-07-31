package com.ssafy.tickle.common.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.common.response.BaseResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 내부 서버 간 통신의 시크릿 키를 검증하는 인터셉터입니다.
 *
 * <p>/internal/** 경로에 적용되며, X-Internal-Secret 헤더가 설정값과
 * 일치하지 않으면 403 응답을 반환합니다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InternalSecretInterceptor implements HandlerInterceptor {

    private static final String INTERNAL_SECRET_HEADER = "X-Internal-Secret";

    @Value("${internal.secret:}")
    private String internalSecret;

    private final ObjectMapper objectMapper;

    /**
     * 요청 헤더의 X-Internal-Secret 값을 검증합니다.
     *
     * @param request  HTTP 요청
     * @param response HTTP 응답
     * @param handler  핸들러
     * @return 검증 통과 시 true, 실패 시 false (403 응답 후 체인 중단)
     */
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        String requestSecret = request.getHeader(INTERNAL_SECRET_HEADER);

        if (requestSecret == null || !requestSecret.equals(internalSecret)) {
            log.warn("내부 API 시크릿 불일치: uri={}, remoteAddr={}", request.getRequestURI(), request.getRemoteAddr());

            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write(
                    objectMapper.writeValueAsString(
                            BaseResponse.error(GlobalErrorCode.INTERNAL_ACCESS_DENIED)
                    )
            );
            return false;
        }

        return true;
    }
}
