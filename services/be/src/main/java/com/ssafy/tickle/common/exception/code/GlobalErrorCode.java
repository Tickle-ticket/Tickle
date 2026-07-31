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

    /** 관리자 전용 API에 권한 없이 접근 (AdminAuthInterceptor) */
    ADMIN_ACCESS_DENIED(403, "관리자 권한이 없습니다."),

    /** 내부 전용 API에 시크릿 없이 접근 (InternalSecretInterceptor) */
    INTERNAL_ACCESS_DENIED(403, "접근 권한이 없습니다."),

    /** IP별 요청 속도 제한 초과 (IpRateLimitInterceptor) */
    TOO_MANY_REQUESTS(429, "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."),

    /** 이미 실행 중인 부하 테스트를 다시 시작 요청 (AdminLoadTestController) */
    LOAD_TEST_ALREADY_RUNNING(409, "이미 부하 테스트가 실행 중입니다.");

    private final int status;
    private final String message;
}
