package com.ssafy.tickle.ai.presentation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * AI 추론 결과 콜백 요청 DTO입니다.
 *
 * @param result      판정 결과
 * @param type        판별 대상 유형
 * @param scheduleId  회차 ID
 * @param eventId     공연 ID
 * @param eventDate   공연 날짜
 * @param pMacro      매크로 확률
 * @param description 판정 설명
 * @param createdAt   추론 결과 생성 시각
 */
public record AiInferenceCallbackRequest(
        @NotNull(message = "result는 필수입니다.")
        InferenceResult result,

        @NotNull(message = "type은 필수입니다.")
        InferenceType type,

        Long scheduleId,

        Long eventId,

        LocalDate eventDate,

        @NotNull(message = "p_macro는 필수입니다.")
        @DecimalMin(value = "0.00", inclusive = true, message = "p_macro는 0.00 이상이어야 합니다.")
        @DecimalMax(value = "1.00", inclusive = true, message = "p_macro는 1.00 이하여야 합니다.")
        BigDecimal pMacro,

        String description,

        @NotNull(message = "created_at은 필수입니다.")
        Instant createdAt
) {
    /**
     * AI 추론 판정 결과입니다.
     */
    public enum InferenceResult {
        BLOCK
    }

    /**
     * AI 추론 대상 플로우 유형입니다.
     */
    public enum InferenceType {
        BOOKING,
        CAPTCHA,
        DETAIL
    }
}
