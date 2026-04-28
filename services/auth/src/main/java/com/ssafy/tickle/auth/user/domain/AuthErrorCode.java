package com.ssafy.tickle.auth.user.domain;

import com.ssafy.tickle.auth.common.exception.code.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 인증 도메인 에러 코드입니다.
 */
@Getter
@RequiredArgsConstructor
public enum AuthErrorCode implements ErrorCode {

    DUPLICATE_EMAIL(409, "이미 사용 중인 이메일입니다."),
    USER_NOT_FOUND(404, "사용자를 찾을 수 없습니다."),
    INVALID_PASSWORD(401, "비밀번호가 일치하지 않습니다."),
    INVALID_TOKEN(401, "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(401, "만료된 토큰입니다."),
    BLACKLISTED_TOKEN(401, "로그아웃된 토큰입니다."),
    REFRESH_TOKEN_NOT_FOUND(401, "Refresh Token이 존재하지 않습니다."),
    REFRESH_TOKEN_MISMATCH(401, "Refresh Token이 일치하지 않습니다.");

    private final int status;
    private final String message;
}
