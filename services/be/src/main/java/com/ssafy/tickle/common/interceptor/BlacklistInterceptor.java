package com.ssafy.tickle.common.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.tickle.blacklist.domain.BlacklistErrorCode;
import com.ssafy.tickle.blacklist.infrastructure.persistence.BlacklistRepository;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.domain.UserErrorCode;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.common.util.JwtProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 블랙리스트에 등록된 사용자의 요청을 차단하는 인터셉터입니다.
 *
 * <p>Authorization 헤더의 Bearer 토큰에서 userId를 추출하여 블랙리스트 여부를 확인합니다.
 * 토큰이 없거나 유효하지 않으면 통과시킵니다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BlacklistInterceptor implements HandlerInterceptor {

    private final BlacklistRepository blacklistRepository;
    private final UserRepository userRepository;
    private final JwtProvider jwtProvider;
    private final ObjectMapper objectMapper;

    /**
     * 블랙리스트 사용자 여부 및 계정 상태를 검증합니다.
     *
     * <p>토큰이 없으면 통과, 블랙리스트에 등록되었거나 비활성 계정인 경우 403 응답을 반환합니다.</p>
     *
     * @param request  HTTP 요청
     * @param response HTTP 응답
     * @param handler  핸들러
     * @return 정상 사용자인 경우 true, 차단 대상인 경우 false
     */
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        // OPTIONS 메서드(Preflight)는 검사 없이 통과
        if (org.springframework.http.HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        Long userId;
        try {
            userId = jwtProvider.extractUserIdFromRequest(request).orElse(null);
        } catch (BaseException e) {
            return true;
        }

        if (userId == null) {
            return true;
        }

        // 1. 유효한 사용자(ACTIVE)인지 먼저 확인
        if (!userRepository.existsByIdAndStatus(userId, User.Status.ACTIVE)) {
            log.warn("비활성 또는 존재하지 않는 사용자 접근 차단: userId={}, uri={}", userId, request.getRequestURI());
            sendErrorResponse(response, UserErrorCode.USER_NOT_ACTIVE);
            return false;
        }

        // 2. 블랙리스트 등록 여부 확인
        if (blacklistRepository.existsByUserId(userId)) {
            log.warn("블랙리스트 사용자 접근 차단: userId={}, uri={}", userId, request.getRequestURI());
            sendErrorResponse(response, BlacklistErrorCode.BLACKLISTED_USER);
            return false;
        }

        return true;
    }

    private void sendErrorResponse(HttpServletResponse response, com.ssafy.tickle.common.exception.code.ErrorCode errorCode) throws Exception {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(
                objectMapper.writeValueAsString(
                        BaseResponse.error(errorCode.getStatus(), errorCode.getMessage())
                )
        );
    }
}
