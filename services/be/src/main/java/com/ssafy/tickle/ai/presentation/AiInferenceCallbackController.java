package com.ssafy.tickle.ai.presentation;

import com.ssafy.tickle.ai.application.AiInferenceCallbackService;
import com.ssafy.tickle.ai.presentation.dto.AiInferenceCallbackRequest;
import com.ssafy.tickle.common.response.BaseResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * AI 추론 결과 콜백을 수신하는 내부 컨트롤러입니다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/internal/ai/v1/bot-detection")
public class AiInferenceCallbackController implements AiInferenceCallbackApiDoc {

    private final AiInferenceCallbackService aiInferenceCallbackService;

    /**
     * AI 추론 결과 콜백을 수신합니다.
     *
     * <p>콜백으로 전달된 사용자 ID와 판정 결과를 서비스에 위임합니다.</p>
     *
     * @param internalSecret 내부 API 시크릿 키
     * @param requestId 요청 추적 ID
     * @param authorization 판정 대상 사용자 Authorization 헤더
     * @param request   AI 추론 결과 콜백 요청
     * @return AI 추론 결과 수신 성공 응답
     */
    @Override
    @PostMapping("/result")
    public ResponseEntity<BaseResponse<Void>> receiveInferenceResult(
            @RequestHeader("X-Internal-Secret") String internalSecret,
            @RequestHeader(value = "X-Request-Id", required = false) String requestId,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody AiInferenceCallbackRequest request
    ) {
        aiInferenceCallbackService.receive(authorization, request);
        return ResponseEntity.ok(
                BaseResponse.success(200, "AI 추론 결과를 정상적으로 수신했습니다.", null)
        );
    }
}
