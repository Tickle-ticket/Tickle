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

    /**
     * 에러 코드 이름을 반환합니다.
     *
     * <p>클라이언트가 실패 사유를 구분하는 근거입니다. status만으로는 나눌 수 없는
     * 경우가 있습니다 — 예를 들어 409 하나에 {@code SEAT_ALREADY_HELD}(다른 좌석을
     * 골라야 함)와 {@code SEAT_LOCK_FAILED}(잠시 후 재시도하면 성공 가능)가 함께
     * 들어갑니다. 메시지 문구로 판별하면 문구를 바꿀 때마다 클라이언트가 깨집니다.</p>
     *
     * <p>모든 구현체가 enum이므로 상수 이름을 그대로 씁니다.</p>
     *
     * @return 에러 코드 이름 (예: SEAT_ALREADY_HELD)
     */
    default String getCode() {
        return ((Enum<?>) this).name();
    }
}
