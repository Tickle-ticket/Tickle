package com.ssafy.tickle.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.ssafy.tickle.common.exception.code.ErrorCode;
import com.ssafy.tickle.common.exception.code.SuccessCode;

/**
 * 모든 API 응답에서 사용하는 공통 응답 포맷입니다.
 *
 * <p>필드는 수신자에 따라 역할이 나뉩니다. {@code message}는 최종 사용자에게 그대로
 * 노출되는 문구, {@code code}는 클라이언트 코드가 분기하는 기준, {@code traceId}와
 * {@code debugMessage}는 개발자가 원인을 찾기 위한 진단 정보입니다. 진단용 두 필드는
 * 값이 없으면 JSON에서 아예 빠지므로 정상 응답의 형태는 기존과 같습니다.</p>
 *
 * @param status       HTTP 상태 코드
 * @param code         결과 코드 이름. 성공은 "OK", 실패는 ErrorCode 상수 이름
 * @param message      사용자에게 보여줄 메시지
 * @param traceId      분산 추적 식별자. Tempo에서 해당 요청의 트레이스를 바로 찾는 데 쓴다
 * @param debugMessage 예외 원문. 운영에서는 정보 노출을 막기 위해 채우지 않는다
 * @param data         응답 데이터
 * @param <T> 응답 데이터 타입
 */
public record BaseResponse<T>(
        int status,
        String code,
        String message,

        // data는 성공 응답에서도 null일 수 있어(success(SuccessCode)) 레코드 전체에
        // NON_NULL을 걸면 기존 응답 형태가 바뀐다. 진단용 두 필드에만 적용한다.
        @JsonInclude(JsonInclude.Include.NON_NULL)
        String traceId,

        @JsonInclude(JsonInclude.Include.NON_NULL)
        String debugMessage,

        T data
) {

    /** 성공 응답의 결과 코드. */
    private static final String SUCCESS_CODE = "OK";

    /** 대응하는 ErrorCode 상수가 없는 실패 응답의 코드. */
    private static final String UNKNOWN_ERROR_CODE = "UNKNOWN";

    /**
     * SuccessCode와 데이터를 기반으로 성공 응답을 생성합니다.
     *
     * @param code 성공 코드
     * @param data 응답 데이터
     * @param <T> 응답 데이터 타입
     * @return 성공 응답
     */
    public static <T> BaseResponse<T> success(SuccessCode code, T data) {
        return new BaseResponse<>(code.getStatus(), SUCCESS_CODE, code.getMessage(), null, null, data);
    }

    /**
     * SuccessCode만을 기반으로 성공 응답을 생성합니다.
     *
     * @param code 성공 코드
     * @param <T> 응답 데이터 타입
     * @return 성공 응답
     */
    public static <T> BaseResponse<T> success(SuccessCode code) {
        return new BaseResponse<>(code.getStatus(), SUCCESS_CODE, code.getMessage(), null, null, null);
    }

    /**
     * 상태 코드, 메시지, 데이터를 직접 지정한 성공 응답을 생성합니다.
     *
     * @param status HTTP 상태 코드
     * @param message 응답 메시지
     * @param data 응답 데이터
     * @param <T> 응답 데이터 타입
     * @return 성공 응답
     */
    public static <T> BaseResponse<T> success(int status, String message, T data) {
        return new BaseResponse<>(status, SUCCESS_CODE, message, null, null, data);
    }

    /**
     * 데이터를 포함한 기본 성공 응답을 생성합니다.
     *
     * @param data 응답 데이터
     * @param <T> 응답 데이터 타입
     * @return 성공 응답
     */
    public static <T> BaseResponse<T> success(T data) {
        return new BaseResponse<>(200, SUCCESS_CODE, "OK", null, null, data);
    }

    /**
     * 에러 코드를 기반으로 실패 응답을 생성합니다.
     *
     * <p>클라이언트가 사유를 구분할 수 있도록 code를 함께 싣습니다. 실패 응답은
     * 되도록 이 메서드를 쓰고, 상수 없이 문자열만 있는 곳에서만 아래 오버로드를
     * 사용합니다.</p>
     *
     * @param errorCode 에러 코드
     * @param message   사용자에게 보여줄 메시지 (커스텀 메시지를 허용하기 위해 분리)
     * @param <T> 응답 데이터 타입
     * @return 실패 응답
     */
    public static <T> BaseResponse<T> error(ErrorCode errorCode, String message) {
        return new BaseResponse<>(errorCode.getStatus(), errorCode.getCode(), message, null, null, null);
    }

    /**
     * 진단 정보를 포함한 실패 응답을 생성합니다.
     *
     * <p>{@code message}는 그대로 두고 진단 정보만 덧붙입니다 — 예외 원문을
     * {@code message}에 넣으면 그 문자열이 사용자 화면에 그대로 렌더링됩니다.</p>
     *
     * @param errorCode    에러 코드
     * @param message      사용자에게 보여줄 메시지
     * @param traceId      분산 추적 식별자 (없으면 null)
     * @param debugMessage 예외 원문 (운영에서는 null)
     * @param <T> 응답 데이터 타입
     * @return 실패 응답
     */
    public static <T> BaseResponse<T> error(
            ErrorCode errorCode,
            String message,
            String traceId,
            String debugMessage
    ) {
        return new BaseResponse<>(
                errorCode.getStatus(), errorCode.getCode(), message, traceId, debugMessage, null
        );
    }

    /**
     * 에러 코드의 기본 메시지로 실패 응답을 생성합니다.
     *
     * @param errorCode 에러 코드
     * @param <T> 응답 데이터 타입
     * @return 실패 응답
     */
    public static <T> BaseResponse<T> error(ErrorCode errorCode) {
        return error(errorCode, errorCode.getMessage());
    }

    /**
     * 상태 코드와 메시지만으로 실패 응답을 생성합니다.
     *
     * <p>대응하는 ErrorCode 상수가 없는 경우에만 사용합니다. code에는 사유를 알 수
     * 없다는 뜻으로 {@code UNKNOWN}을 채웁니다 — 클라이언트가 status로만 분기하게
     * 두기보다, 코드가 비어 있음을 명시하는 편이 낫습니다.</p>
     *
     * @param status HTTP 상태 코드
     * @param message 에러 메시지
     * @param <T> 응답 데이터 타입
     * @return 실패 응답
     */
    public static <T> BaseResponse<T> error(int status, String message) {
        return new BaseResponse<>(status, UNKNOWN_ERROR_CODE, message, null, null, null);
    }
}
