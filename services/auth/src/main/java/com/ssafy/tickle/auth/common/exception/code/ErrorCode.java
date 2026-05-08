package com.ssafy.tickle.auth.common.exception.code;

/**
 * 공통 에러 코드 인터페이스입니다.
 */
public interface ErrorCode {

    /**
     * HTTP 상태 코드를 반환합니다.
     */
    int getStatus();

    /**
     * 에러 메시지를 반환합니다.
     */
    String getMessage();
}
