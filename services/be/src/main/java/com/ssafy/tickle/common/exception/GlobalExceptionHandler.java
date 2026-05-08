package com.ssafy.tickle.common.exception;

import com.ssafy.tickle.common.exception.code.ErrorCode;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.common.response.BaseResponse;
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
     *
     * @param exception 커스텀 예외
     * @return 공통 에러 응답
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
     * @Valid 검증 실패 예외를 처리합니다.
     *
     * @param exception 검증 예외
     * @return 공통 에러 응답
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
     * 지원하지 않는 HTTP 메서드 예외를 처리합니다.
     *
     * @param exception HTTP 메서드 예외
     * @return 공통 에러 응답
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
     * 처리되지 않은 모든 예외를 처리합니다.
     *
     * @param exception 예상하지 못한 예외
     * @return 공통 에러 응답
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

	/**
	 * Actuator 등 정적 리소스를 찾지 못할 때 404로 처리합니다.
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
}
