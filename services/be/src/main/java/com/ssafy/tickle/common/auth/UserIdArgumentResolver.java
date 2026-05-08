package com.ssafy.tickle.common.auth;

import com.ssafy.tickle.auth.domain.AuthErrorCode;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.util.JwtProvider;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * {@link UserId} 어노테이션이 붙은 파라미터에 JWT에서 추출한 userId를 주입합니다.
 */
@Component
@RequiredArgsConstructor
public class UserIdArgumentResolver implements HandlerMethodArgumentResolver {

    private final JwtProvider jwtProvider;

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(UserId.class)
                && Long.class.isAssignableFrom(parameter.getParameterType());
    }

    /**
     * Authorization 헤더의 Bearer 토큰에서 userId를 추출하여 반환합니다.
     *
     * @throws BaseException required=true이고 토큰이 없거나 유효하지 않은 경우
     */
    @Override
    public Object resolveArgument(
            MethodParameter parameter,
            ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest,
            WebDataBinderFactory binderFactory
    ) {
        HttpServletRequest request = webRequest.getNativeRequest(HttpServletRequest.class);
        String token = jwtProvider.resolveToken(request);

        // EventSource는 Authorization 헤더를 지원하지 않으므로 쿼리 파라미터로 fallback
        if (token == null) {
            token = request.getParameter("token");
        }

        boolean required = parameter.getParameterAnnotation(UserId.class).required();

        if (token == null) {
            if (required) {
                throw new BaseException(AuthErrorCode.MISSING_TOKEN);
            }
            return null;
        }

        return jwtProvider.extractUserId(token);
    }
}
