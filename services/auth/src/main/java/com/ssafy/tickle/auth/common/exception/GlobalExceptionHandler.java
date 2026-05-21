package com.ssafy.tickle.auth.common.exception;

import com.ssafy.tickle.auth.common.exception.code.ErrorCode;
import com.ssafy.tickle.auth.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.auth.common.response.BaseResponse;
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
public class GlobalExceptionHandler {

    /**
     * 커스텀 비즈니스 예외를 처리합니다.
     */
    @ExceptionHandler(BaseException.class)
    protected ResponseEntity<BaseResponse<Void>> handleBaseException(BaseException exception) {
        log.error("handleBaseException", exception);
        ErrorCode errorCode = exception.getErrorCode();
        return ResponseEntity
                .status(errorCode.getStatus())
                .body(BaseResponse.error(errorCode.getStatus(), exception.getMessage()));
    }

    /**
     * 요청 바디 유효성 검사 실패를 처리합니다.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    protected ResponseEntity<BaseResponse<Void>> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException exception
    ) {
        log.error("handleMethodArgumentNotValidException", exception);
        return ResponseEntity
                .status(GlobalErrorCode.INVALID_INPUT_VALUE.getStatus())
                .body(BaseResponse.error(
                        GlobalErrorCode.INVALID_INPUT_VALUE.getStatus(),
                        exception.getBindingResult().getAllErrors().get(0).getDefaultMessage()
                ));
    }

    /**
     * 허용되지 않은 HTTP 메서드 요청을 처리합니다.
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    protected ResponseEntity<BaseResponse<Void>> handleHttpRequestMethodNotSupportedException(
            HttpRequestMethodNotSupportedException exception
    ) {
        log.error("handleHttpRequestMethodNotSupportedException", exception);
        return ResponseEntity
                .status(GlobalErrorCode.METHOD_NOT_ALLOWED.getStatus())
                .body(BaseResponse.error(
                        GlobalErrorCode.METHOD_NOT_ALLOWED.getStatus(),
                        GlobalErrorCode.METHOD_NOT_ALLOWED.getMessage()
                ));
    }

    /**
     * 존재하지 않는 리소스 요청을 처리합니다.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    protected ResponseEntity<BaseResponse<Void>> handleNoResourceFoundException(
            NoResourceFoundException exception
    ) {
        return ResponseEntity
                .status(GlobalErrorCode.RESOURCE_NOT_FOUND.getStatus())
                .body(BaseResponse.error(
                        GlobalErrorCode.RESOURCE_NOT_FOUND.getStatus(),
                        exception.getMessage()
                ));
    }

    /**
     * 처리되지 않은 예외를 처리합니다.
     */
    @ExceptionHandler(Exception.class)
    protected ResponseEntity<BaseResponse<Void>> handleException(Exception exception) {
        log.error("handleException", exception);
        return ResponseEntity
                .status(GlobalErrorCode.INTERNAL_SERVER_ERROR.getStatus())
                .body(BaseResponse.error(
                        GlobalErrorCode.INTERNAL_SERVER_ERROR.getStatus(),
                        GlobalErrorCode.INTERNAL_SERVER_ERROR.getMessage()
                ));
    }
}
