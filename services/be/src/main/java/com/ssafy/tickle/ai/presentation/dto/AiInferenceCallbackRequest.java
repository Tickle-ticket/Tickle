package com.ssafy.tickle.ai.presentation.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * AI 추론 결과 콜백 요청 DTO입니다.
 *
 * @param recordId   AI 서버의 1차 봇 판별 결과 식별자
 * @param result      판정 결과
 * @param type        판별 대상 유형
 * @param scheduleId  회차 ID
 * @param eventId     공연 ID
 * @param eventDate   공연 날짜
 * @param pMacro      매크로 확률
 * @param description 판정 설명
 * @param createdAt   추론 결과 생성 시각
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AiInferenceCallbackRequest(
        @NotBlank(message = "recordId는 필수입니다.")
        @Size(max = 128, message = "recordId는 128자를 초과할 수 없습니다.")
        String recordId,

        @NotNull(message = "result는 필수입니다.")
        InferenceResult result,

        @NotNull(message = "type은 필수입니다.")
        InferenceType type,

        Long scheduleId,

        Long eventId,

        LocalDate eventDate,

        @DecimalMin(value = "0.00", inclusive = true, message = "pMacro는 0.00 이상이어야 합니다.")
        @DecimalMax(value = "1.00", inclusive = true, message = "pMacro는 1.00 이하여야 합니다.")
        BigDecimal pMacro,

        String description,

        @NotNull(message = "createdAt은 필수입니다.")
        Instant createdAt
) {
    /**
     * AI 추론 판정 결과입니다.
     */
    public enum InferenceResult {
        BLOCK,
        UNBLOCK
    }

    /**
     * AI 추론 대상 플로우 유형입니다.
     */
    public enum InferenceType {
        BOOKING,
        CAPTCHA,
        CAPTCHA_RETRY,
        DETAIL
    }
}
