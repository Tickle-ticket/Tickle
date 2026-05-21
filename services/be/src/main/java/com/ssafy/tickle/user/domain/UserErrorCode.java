package com.ssafy.tickle.user.domain;

import com.ssafy.tickle.common.exception.code.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 사용자 도메인 관련 에러 코드를 정의합니다.
 */
@Getter
@RequiredArgsConstructor
public enum UserErrorCode implements ErrorCode {

    USER_NOT_FOUND(404, "존재하지 않는 사용자입니다."),
    USER_NOT_ACTIVE(403, "비활성화되었거나 차단된 사용자입니다."),
    DUPLICATE_NICKNAME(409, "이미 사용 중인 닉네임입니다."),
    DUPLICATE_PHONE(409, "이미 가입된 전화번호입니다.");

    private final int status;
    private final String message;
}
