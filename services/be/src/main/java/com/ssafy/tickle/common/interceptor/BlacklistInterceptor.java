package com.ssafy.tickle.common.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.tickle.blacklist.domain.BlacklistErrorCode;
import com.ssafy.tickle.blacklist.infrastructure.persistence.BlacklistRepository;
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
    private final JwtProvider jwtProvider;
    private final ObjectMapper objectMapper;

    /**
     * 블랙리스트 사용자 여부를 검증합니다.
     *
     * <p>토큰이 없으면 통과, 블랙리스트에 등록된 경우 403 응답을 반환합니다.</p>
     *
     * @param request  HTTP 요청
     * @param response HTTP 응답
     * @param handler  핸들러
     * @return 정상 사용자인 경우 true, 블랙리스트 사용자인 경우 false (403 응답 후 체인 중단)
     */
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        Long userId;
        try {
            userId = jwtProvider.extractUserIdFromRequest(request).orElse(null);
        } catch (BaseException e) {
            // 토큰이 있으나 유효하지 않은 경우도 블랙리스트 체크 없이 통과시킨다.
            // 유효하지 않은 토큰 거부는 UserIdArgumentResolver에서 처리한다.
            return true;
        }

        if (userId == null) {
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
}
