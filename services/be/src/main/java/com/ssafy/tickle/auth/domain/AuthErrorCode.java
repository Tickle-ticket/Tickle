package com.ssafy.tickle.auth.domain;

import com.ssafy.tickle.common.exception.code.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 인증 도메인 에러 코드입니다.
 */
@Getter
@RequiredArgsConstructor
public enum AuthErrorCode implements ErrorCode {

    MISSING_TOKEN(401, "인증 토큰이 없습니다."),
    INVALID_TOKEN(401, "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(401, "만료된 토큰입니다.");

    private final int status;
    private final String message;
}
