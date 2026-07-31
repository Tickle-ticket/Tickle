package com.ssafy.tickle.auth.common.exception;

import com.ssafy.tickle.auth.common.exception.code.ErrorCode;
import com.ssafy.tickle.auth.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.auth.common.response.BaseResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * 애플리케이션 전역 예외를 공통 응답 형식으로 변환하는 핸들러입니다.
 */
@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private final ExceptionDiagnostics diagnostics;

    /**
     * 커스텀 비즈니스 예외를 처리합니다.
     *
     * @param exception 커스텀 예외
     * @return 공통 에러 응답
     */
    @ExceptionHandler(BaseException.class)
    protected ResponseEntity<BaseResponse<Void>> handleBaseException(BaseException exception) {
        ErrorCode errorCode = exception.getErrorCode();

        // 4xx는 클라이언트가 code로 사유를 알 수 있고 서버가 의도한 흐름이므로
        // traceId를 싣지 않는다. 5xx만 추적 대상이다.
        if (errorCode.getStatus() < 500) {
            log.warn("handleBaseException code={} message={}", errorCode.getCode(), exception.getMessage());
            return ResponseEntity
                    .status(errorCode.getStatus())
                    .body(BaseResponse.error(errorCode, exception.getMessage()));
        }

        String traceId = diagnostics.traceId();
        log.error("handleBaseException code={} traceId={}", errorCode.getCode(), traceId, exception);
        return ResponseEntity
                .status(errorCode.getStatus())
                .body(BaseResponse.error(errorCode, exception.getMessage(), traceId, null));
    }

    /**
     * 요청 바디 유효성 검사 실패를 처리합니다.
     *
     * @param exception 검증 예외
     * @return 공통 에러 응답
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    protected ResponseEntity<BaseResponse<Void>> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException exception
    ) {
        log.warn("handleMethodArgumentNotValidException", exception);
        return ResponseEntity
                .status(GlobalErrorCode.INVALID_INPUT_VALUE.getStatus())
                .body(BaseResponse.error(
                        GlobalErrorCode.INVALID_INPUT_VALUE,
                        exception.getBindingResult().getAllErrors().get(0).getDefaultMessage()
                ));
    }

    /**
     * 허용되지 않은 HTTP 메서드 요청을 처리합니다.
     *
     * @param exception HTTP 메서드 예외
     * @return 공통 에러 응답
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    protected ResponseEntity<BaseResponse<Void>> handleHttpRequestMethodNotSupportedException(
            HttpRequestMethodNotSupportedException exception
    ) {
        log.warn("handleHttpRequestMethodNotSupportedException", exception);
        return ResponseEntity
                .status(GlobalErrorCode.METHOD_NOT_ALLOWED.getStatus())
                .body(BaseResponse.error(GlobalErrorCode.METHOD_NOT_ALLOWED));
    }

    /**
     * 존재하지 않는 리소스 요청을 처리합니다.
     *
     * @param exception 리소스 미존재 예외
     * @return 공통 에러 응답
     */
    @ExceptionHandler(NoResourceFoundException.class)
    protected ResponseEntity<BaseResponse<Void>> handleNoResourceFoundException(
            NoResourceFoundException exception
    ) {
        return ResponseEntity
                .status(GlobalErrorCode.RESOURCE_NOT_FOUND.getStatus())
                .body(BaseResponse.error(
                        GlobalErrorCode.RESOURCE_NOT_FOUND,
                        exception.getMessage()
                ));
    }

    /**
     * 처리되지 않은 모든 예외를 처리합니다.
     *
     * <p>비즈니스 로직 밖에서 터진 예외(NPE, 제약 위반 등)라 어떤 ErrorCode에도
     * 해당하지 않습니다. 사용자에게는 일반화된 문구를 그대로 주되, 원인을 추적할 수
     * 있도록 traceId와 (운영이 아닌 환경에 한해) 예외 원문을 함께 싣습니다.</p>
     *
     * @param exception 예상하지 못한 예외
     * @return 공통 에러 응답
     */
    @ExceptionHandler(Exception.class)
    protected ResponseEntity<BaseResponse<Void>> handleException(Exception exception) {
        String traceId = diagnostics.traceId();
        log.error("handleException traceId={}", traceId, exception);
        return ResponseEntity
                .status(GlobalErrorCode.INTERNAL_SERVER_ERROR.getStatus())
                .body(BaseResponse.error(
                        GlobalErrorCode.INTERNAL_SERVER_ERROR,
                        GlobalErrorCode.INTERNAL_SERVER_ERROR.getMessage(),
                        traceId,
                        diagnostics.debugMessage(exception)
                ));
    }
}
