package com.ssafy.tickle.common.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.common.util.JwtProvider;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.domain.UserRole;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 관리자 권한을 검증하는 인터셉터입니다.
 *
 * <p>/api/v1/admin/** 경로에 적용되며, Bearer 토큰에서 추출한 userId가 ADMIN 역할인지 검증합니다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminAuthInterceptor implements HandlerInterceptor {

    private final UserRepository userRepository;
    private final JwtProvider jwtProvider;
    private final ObjectMapper objectMapper;

    /**
     * 요청자의 관리자 권한을 검증합니다.
     *
     * @param request  HTTP 요청
     * @param response HTTP 응답
     * @param handler  핸들러
     * @return ADMIN 권한 보유 시 true, 그 외 false (403 응답 후 체인 중단)
     */
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        // OPTIONS 메서드(Preflight)는 권한 검사 없이 통과
        if (org.springframework.http.HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        Long userId;
        try {
            userId = resolveAdminUserId(request);
        } catch (BaseException e) {
            log.warn("관리자 인증 실패 - 유효하지 않은 토큰: uri={}", request.getRequestURI());
            return writeForbidden(response, "관리자 인증이 필요합니다.");
        }

        if (userId == null) {
            log.warn("관리자 인증 실패 - 토큰 없음: uri={}", request.getRequestURI());
            return writeForbidden(response, "관리자 인증이 필요합니다.");
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("관리자 인증 실패 - 사용자 없음: userId={}, uri={}", userId, request.getRequestURI());
            return writeForbidden(response, "관리자 인증이 필요합니다.");
        }

        if (user.getRole() != UserRole.ADMIN) {
            log.warn("관리자 인증 실패 - 권한 부족: userId={}, role={}, uri={}", userId, user.getRole(), request.getRequestURI());
            return writeForbidden(response, "관리자 권한이 필요합니다.");
        }

        return true;
    }

    private Long resolveAdminUserId(HttpServletRequest request) {
        String token = jwtProvider.resolveToken(request);
        if (token == null) {
            token = request.getParameter("token");
        }
        if (token == null) {
            return null;
        }
        return jwtProvider.extractUserId(token);
    }

    /**
     * 403 Forbidden 응답을 JSON 형식으로 작성합니다.
     *
     * @param response HTTP 응답
     * @param message  에러 메시지
     * @return 항상 false (체인 중단)
     */
    private boolean writeForbidden(HttpServletResponse response, String message) throws Exception {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(
                objectMapper.writeValueAsString(
                        BaseResponse.error(GlobalErrorCode.ADMIN_ACCESS_DENIED, message)
                )
        );
        return false;
    }
}
