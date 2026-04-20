package com.ssafy.tickle.common.exception.code;

/**
 * 공통 에러 코드 인터페이스입니다.
 */
public interface ErrorCode {

    /**
     * HTTP 상태 코드를 반환합니다.
     *
     * @return HTTP 상태 코드
     */
    int getStatus();

    /**
     * 에러 메시지를 반환합니다.
     *
     * @return 에러 메시지
     */
    String getMessage();
}
