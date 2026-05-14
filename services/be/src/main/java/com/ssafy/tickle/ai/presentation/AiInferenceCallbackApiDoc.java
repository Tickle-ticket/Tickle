package com.ssafy.tickle.ai.presentation;

import com.ssafy.tickle.ai.presentation.dto.AiInferenceCallbackRequest;
import com.ssafy.tickle.common.response.BaseResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

/**
 * AI 추론 결과 콜백 API 문서 인터페이스입니다.
 */
@Tag(name = "AI Inference Callback", description = "봇/매크로 판별 결과 수신용 내부 콜백 API")
public interface AiInferenceCallbackApiDoc {

    /**
     * AI 추론 결과 콜백 수신 API 문서를 정의합니다.
     *
     * @param internalSecret 내부 API 시크릿 키
     * @param requestId 요청 추적 ID
     * @param authorization 판정 대상 사용자 Authorization 헤더
     * @param request   AI 추론 결과 콜백 요청
     * @return AI 추론 결과 수신 성공 응답
     */
    @Operation(
            summary = "AI 추론 결과 콜백 수신",
            description = """
                    AI Inference Worker 또는 RunPod GPU Server가 봇/매크로 판별 결과를 전달하는 내부 콜백 API입니다.

                    - 내부 API 인증을 위해 `X-Internal-Secret` 헤더가 필요합니다.
                    - 판정 대상 사용자는 `Authorization: Bearer {accessToken}` 헤더에서만 추출합니다.
                    - query parameter의 `userId`와 request body의 `accessToken`은 신뢰하지 않습니다.
                    - AI `result`는 `BLOCK`, `UNBLOCK`을 사용합니다.
                    - `recordId`는 AI 서버의 1차 봇 판별 결과 식별자이며, 이후 CAPTCHA 추가 검증 결과 매칭에 사용합니다.
                    - Request Body 필드는 camelCase로 전달합니다.
                    - `BLOCK` 판정만 블랙리스트 등록 및 CAPTCHA 재시도 요청 대상이며, 그 외 판정은 조용히 무시합니다.
                    - `BLOCK` 판정 시 `recordId`를 Redis에 10분간 저장하고 SSE `captcha` 이벤트에 포함해 FE로 전달합니다.
                    - SSE `result`는 `RETRY_CAPTCHA`, `SUCCESS_CLOSE`, `DENY_CLOSE`를 사용합니다.
                    - 성공 시 결과를 수신했음을 알리고, 실패 시 잘못된 입력값을 반환합니다.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "AI 추론 결과 수신 성공"),
            @ApiResponse(responseCode = "400", description = "잘못된 입력값"),
            @ApiResponse(responseCode = "403", description = "내부 API 인증 실패"),
            @ApiResponse(responseCode = "500", description = "서버 내부 오류")
    })
    ResponseEntity<BaseResponse<Void>> receiveInferenceResult(
            @RequestHeader("X-Internal-Secret") String internalSecret,
            @RequestHeader(value = "X-Request-Id", required = false) String requestId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @Valid @RequestBody AiInferenceCallbackRequest request
    );
}
