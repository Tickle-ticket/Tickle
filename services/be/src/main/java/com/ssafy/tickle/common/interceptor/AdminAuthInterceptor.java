package com.ssafy.tickle.common.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.tickle.common.response.BaseResponse;
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

import java.util.Optional;

/**
 * 관리자 권한을 검증하는 인터셉터입니다.
 *
 * <p>/api/v1/admin/** 경로에 적용되며, 요청자가 ADMIN 역할을 가진 사용자인지 검증합니다.
 * userId는 요청 파라미터 "userId" 또는 헤더 "X-User-Id"에서 추출합니다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminAuthInterceptor implements HandlerInterceptor {

    private static final String USER_ID_PARAM = "userId";
    private static final String USER_ID_HEADER = "X-User-Id";

    private final UserRepository userRepository;
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

        String userIdStr = resolveUserId(request);

        if (userIdStr == null || userIdStr.isBlank()) {
            log.warn("관리자 인증 실패 - userId 없음: uri={}", request.getRequestURI());
            return writeForbidden(response, "관리자 인증이 필요합니다.");
        }

        Long userId;
        try {
            userId = Long.parseLong(userIdStr);
        } catch (NumberFormatException e) {
            log.warn("관리자 인증 실패 - userId 형식 오류: userIdStr={}, uri={}", userIdStr, request.getRequestURI());
            return writeForbidden(response, "관리자 인증이 필요합니다.");
        }

        Optional<User> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            log.warn("관리자 인증 실패 - 사용자 없음: userId={}, uri={}", userId, request.getRequestURI());
            return writeForbidden(response, "관리자 인증이 필요합니다.");
        }

        User user = userOptional.get();
        if (user.getRole() != UserRole.ADMIN) {
            log.warn("관리자 인증 실패 - 권한 부족: userId={}, role={}, uri={}", userId, user.getRole(), request.getRequestURI());
            return writeForbidden(response, "관리자 권한이 필요합니다.");
        }

        return true;
    }

    /**
     * 요청 파라미터 "userId"를 우선 확인하고, 없으면 헤더 "X-User-Id"를 확인합니다.
     *
     * @param request HTTP 요청
     * @return 사용자 ID 문자열, 없으면 null
     */
    private String resolveUserId(HttpServletRequest request) {
        String paramUserId = request.getParameter(USER_ID_PARAM);
        if (paramUserId != null && !paramUserId.isBlank()) {
            return paramUserId;
        }
        return request.getHeader(USER_ID_HEADER);
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
                        BaseResponse.error(HttpStatus.FORBIDDEN.value(), message)
                )
        );
        return false;
    }
}
