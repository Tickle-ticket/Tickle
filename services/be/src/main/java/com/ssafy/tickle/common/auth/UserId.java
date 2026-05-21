package com.ssafy.tickle.common.auth;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 컨트롤러 파라미터에 붙여 JWT에서 추출한 userId를 주입받는 어노테이션입니다.
 *
 * <pre>
 * // 인증 필수
 * public ResponseEntity<?> create(@UserId Long userId) { ... }
 *
 * // 인증 선택 (비로그인 허용)
 * public ResponseEntity<?> getList(@UserId(required = false) Long userId) { ... }
 * </pre>
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface UserId {

    /**
     * true이면 토큰 없을 시 401, false이면 null 반환.
     */
    boolean required() default true;
}
