package com.ssafy.tickle.blacklist.presentation;

import com.ssafy.tickle.blacklist.presentation.dto.CaptchaVerificationRequest;
import com.ssafy.tickle.blacklist.presentation.dto.CaptchaVerificationResponse;
import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.response.BaseResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 봇 탐지 CAPTCHA API 문서 인터페이스입니다.
 */
@Tag(name = "Bot Detection CAPTCHA", description = "봇 탐지 CAPTCHA SSE 및 검증 API")
public interface BotDetectionCaptchaApiDoc {

    /**
     * CAPTCHA 상태 SSE 구독 API 문서를 정의합니다.
     *
     * @param userId   JWT에서 추출한 사용자 식별자
     * @param response HTTP 응답
     * @return CAPTCHA 상태 SSE 스트림
     */
    @Operation(
            summary = "봇 탐지 CAPTCHA SSE 구독",
            description = """
                    봇 탐지 결과에 따라 FE가 CAPTCHA UI 제어 이벤트를 수신하는 SSE API입니다.

                    - 같은 userId의 모든 SSE 연결에 CAPTCHA 이벤트를 전송합니다.
                    - `captcha` 이벤트의 result 값은 `RETRY_CAPTCHA`, `SUCCESS_CLOSE`, `DENY_CLOSE`입니다.
                    - CAPTCHA 이벤트에는 AI 서버의 1차 봇 판별 결과 식별자인 `recordId`가 포함됩니다.
                    - `RETRY_CAPTCHA` 수신 시 FE는 Cloudflare Turnstile CAPTCHA를 표시합니다.
                    - `SUCCESS_CLOSE`, `DENY_CLOSE` 수신 시 FE는 CAPTCHA UI를 종료합니다.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "SSE 연결 성공"),
            @ApiResponse(
                    responseCode = "401",
                    description = "인증 실패",
                    content = @Content(schema = @Schema(implementation = BaseResponse.class))
            )
    })
    SseEmitter subscribe(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1")
            @UserId Long userId,

            @Parameter(hidden = true)
            HttpServletResponse response
    );

    /**
     * CAPTCHA 검증 API 문서를 정의합니다.
     *
     * @param userId             JWT에서 추출한 사용자 식별자
     * @param request            CAPTCHA 검증 요청
     * @param httpServletRequest HTTP 요청
     * @return CAPTCHA 검증 처리 결과
     */
    @Operation(
            summary = "봇 탐지 CAPTCHA 검증",
            description = """
                    FE가 Cloudflare Turnstile CAPTCHA 수행 결과와 token을 전달하는 API입니다.

                    - 요청에는 SSE로 전달받은 `recordId`를 반드시 포함해야 합니다.
                    - `recordId`는 Redis에 저장된 `userId + recordId` pending record와 일치해야 합니다.
                    - `type`은 `CAPTCHA_RETRY` 고정값입니다.
                    - `success=false`이면 Cloudflare 검증 없이 실패 처리하고 SSE로 `DENY_CLOSE`를 전송합니다.
                    - `success=true`이면 Cloudflare Siteverify API로 token을 검증합니다.
                    - CAPTCHA 성공 시 AI 서버에 `{ result: "ALLOW", recordId, type: "CAPTCHA_RETRY", createdAt }`을 전송합니다.
                    - CAPTCHA 실패 시 AI 서버에 `{ result: "BLOCK", recordId, type: "CAPTCHA_RETRY", createdAt }`을 전송합니다.
                    - Cloudflare 검증 성공 시 해당 사용자의 blacklist를 해제하고 SSE로 `SUCCESS_CLOSE`를 전송합니다.
                    - Cloudflare 검증 실패 시 blacklist를 유지하고 SSE로 `DENY_CLOSE`를 전송합니다.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "CAPTCHA 검증 처리 성공"),
            @ApiResponse(
                    responseCode = "400",
                    description = "CAPTCHA 검증 실패 또는 잘못된 요청",
                    content = @Content(schema = @Schema(implementation = BaseResponse.class))
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "인증 실패",
                    content = @Content(schema = @Schema(implementation = BaseResponse.class))
            )
    })
    ResponseEntity<BaseResponse<CaptchaVerificationResponse>> verifyCaptcha(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1")
            @UserId Long userId,

            @Valid @RequestBody CaptchaVerificationRequest request,

            @Parameter(hidden = true)
            HttpServletRequest httpServletRequest
    );
}
