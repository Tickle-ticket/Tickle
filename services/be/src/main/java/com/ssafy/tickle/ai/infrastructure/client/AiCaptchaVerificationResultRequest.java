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

    /**
     * CAPTCHA 추가 검증 성공 결과 요청을 생성합니다.
     *
     * <p>{@code createdAt}은 FE 요청 시각이 아니라 BE가 후속 결과를 생성하는 현재 시각입니다.</p>
     *
     * @param recordId AI 서버의 1차 봇 판별 결과 식별자
     * @return AI 서버에 전달할 ALLOW 결과 요청
     */
    public static AiCaptchaVerificationResultRequest allow(String recordId) {
        return new AiCaptchaVerificationResultRequest(Result.ALLOW, recordId, InferenceType.CAPTCHA_RETRY, Instant.now());
    }

    /**
     * CAPTCHA 추가 검증 실패 결과 요청을 생성합니다.
     *
     * <p>{@code createdAt}은 FE 요청 시각이 아니라 BE가 후속 결과를 생성하는 현재 시각입니다.</p>
     *
     * @param recordId AI 서버의 1차 봇 판별 결과 식별자
     * @return AI 서버에 전달할 BLOCK 결과 요청
     */
    public static AiCaptchaVerificationResultRequest block(String recordId) {
        return new AiCaptchaVerificationResultRequest(Result.BLOCK, recordId, InferenceType.CAPTCHA_RETRY, Instant.now());
    }

    /**
     * CAPTCHA 추가 검증 이후 AI 서버에 전달할 최종 결과입니다.
     */
    public enum Result {
        BLOCK,
        ALLOW
    }
}
