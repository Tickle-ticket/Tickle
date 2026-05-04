package com.ssafy.tickle.ai.presentation;

import com.ssafy.tickle.ai.presentation.dto.AiInferenceCallbackRequest;
import com.ssafy.tickle.common.response.BaseResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

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
     * @param userId    판정 대상 사용자 ID
     * @param request   AI 추론 결과 콜백 요청
     * @return AI 추론 결과 수신 성공 응답
     */
    @Operation(
            summary = "AI 추론 결과 콜백 수신",
            description = """
                    AI Inference Worker 또는 RunPod GPU Server가 봇/매크로 판별 결과를 전달하는 내부 콜백 API입니다.

                    - 내부 API 인증을 위해 `X-Internal-Secret` 헤더가 필요합니다.
                    - 판정 대상 사용자는 `userId` query parameter로 전달합니다.
                    - `result`는 `BLOCK`, `type`은 `BOOKING`으로 전달합니다.
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
            @RequestParam Long userId,
            @Valid @RequestBody AiInferenceCallbackRequest request
    );
}
