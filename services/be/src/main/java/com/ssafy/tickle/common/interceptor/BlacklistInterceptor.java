package com.ssafy.tickle.common.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.tickle.blacklist.domain.BlacklistErrorCode;
import com.ssafy.tickle.blacklist.infrastructure.persistence.BlacklistRepository;
import com.ssafy.tickle.common.response.BaseResponse;
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
 * <p>요청 파라미터 "userId" 또는 헤더 "X-User-Id"에서 사용자 ID를 추출하여
 * 블랙리스트 여부를 확인합니다. 인증되지 않은 요청(userId 없음)은 통과시킵니다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BlacklistInterceptor implements HandlerInterceptor {

    private static final String USER_ID_PARAM = "userId";
    private static final String USER_ID_HEADER = "X-User-Id";

    private final BlacklistRepository blacklistRepository;
    private final ObjectMapper objectMapper;

    /**
     * 블랙리스트 사용자 여부를 검증합니다.
     *
     * <p>userId가 없으면 통과, 블랙리스트에 등록된 경우 403 응답을 반환합니다.</p>
     *
     * @param request  HTTP 요청
     * @param response HTTP 응답
     * @param handler  핸들러
     * @return 정상 사용자인 경우 true, 블랙리스트 사용자인 경우 false (403 응답 후 체인 중단)
     */
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        String userIdStr = resolveUserId(request);

        if (userIdStr == null || userIdStr.isBlank()) {
            return true;
        }

        Long userId;
        try {
            userId = Long.parseLong(userIdStr);
        } catch (NumberFormatException e) {
            return true;
        }

        if (blacklistRepository.existsByUserId(userId)) {
            log.warn("블랙리스트 사용자 접근 차단: userId={}, uri={}", userId, request.getRequestURI());

            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write(
                    objectMapper.writeValueAsString(
                            BaseResponse.error(
                                    BlacklistErrorCode.BLACKLISTED_USER.getStatus(),
                                    BlacklistErrorCode.BLACKLISTED_USER.getMessage()
                            )
                    )
            );
            return false;
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
}
