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

    /**
     * 에러 코드 이름을 반환합니다.
     *
     * <p>클라이언트가 실패 사유를 구분하는 근거입니다. status만으로는 나눌 수 없는
     * 경우가 많습니다 — 예를 들어 401 하나에 {@code INVALID_PASSWORD}(비밀번호 필드에
     * 오류를 표시), {@code EXPIRED_TOKEN}(토큰 재발급 후 재시도), {@code
     * BLACKLISTED_TOKEN}(로그인 화면으로 이동)이 함께 들어갑니다. 메시지 문구로
     * 판별하면 문구를 바꿀 때마다 클라이언트가 깨집니다.</p>
     *
     * <p>모든 구현체가 enum이므로 상수 이름을 그대로 씁니다.</p>
     *
     * @return 에러 코드 이름 (예: EXPIRED_TOKEN)
     */
    default String getCode() {
        return ((Enum<?>) this).name();
    }
}
