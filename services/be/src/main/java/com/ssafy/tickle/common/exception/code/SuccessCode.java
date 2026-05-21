package com.ssafy.tickle.common.exception.code;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 공통 성공 코드를 정의합니다.
 */
@Getter
@RequiredArgsConstructor
public enum SuccessCode {

    OK(200, "OK"),
    CREATED(201, "생성이 완료되었습니다.");

    private final int status;
    private final String message;
}
