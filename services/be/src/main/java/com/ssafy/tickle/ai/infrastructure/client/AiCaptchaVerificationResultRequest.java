package com.ssafy.tickle.ai.infrastructure.client;

import com.ssafy.tickle.ai.presentation.dto.AiInferenceCallbackRequest.InferenceType;
import java.time.Instant;

/**
 * CAPTCHA 추가 검증 결과를 AI 서버에 전달하는 요청입니다.
 *
 * @param result    추가 검증 결과
 * @param recordId  AI 서버의 1차 봇 판별 결과 식별자
 * @param type      추가 검증 유형
 * @param createdAt 추가 검증 결과 생성 시각
 */
public record AiCaptchaVerificationResultRequest(
        Result result,
        String recordId,
        InferenceType type,
        Instant createdAt
) {

    public static AiCaptchaVerificationResultRequest allow(String recordId) {
        return new AiCaptchaVerificationResultRequest(Result.ALLOW, recordId, InferenceType.CAPTCHA_RETRY, Instant.now());
    }

    public static AiCaptchaVerificationResultRequest block(String recordId) {
        return new AiCaptchaVerificationResultRequest(Result.BLOCK, recordId, InferenceType.CAPTCHA_RETRY, Instant.now());
    }

    public enum Result {
        BLOCK,
        ALLOW
    }
}
