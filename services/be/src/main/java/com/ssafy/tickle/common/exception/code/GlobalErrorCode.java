package com.ssafy.tickle.common.exception.code;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 전역 공통 에러 코드를 정의합니다.
 */
@Getter
@RequiredArgsConstructor
public enum GlobalErrorCode implements ErrorCode {

    INVALID_INPUT_VALUE(400, "잘못된 입력값입니다."),
    INVALID_REQUEST(400, "잘못된 요청입니다."),
    METHOD_NOT_ALLOWED(405, "허용되지 않은 HTTP 메서드입니다."),
    INTERNAL_SERVER_ERROR(500, "서버 내부 오류가 발생했습니다."),
    ENTITY_NOT_FOUND(404, "대상을 찾을 수 없습니다."),
    RESOURCE_NOT_FOUND(404, "해당 리소스를 찾을 수 없습니다."),
    ACCESS_DENIED(403, "접근 권한이 없습니다."),
    CONFLICT(409, "이미 존재하는 리소스입니다."),
    QUEUE_NOT_OPEN(400, "아직 예매 오픈 전인 회차입니다."),
    QUEUE_CLOSED(400, "예매가 종료된 회차입니다.");

    private final int status;
    private final String message;
}
