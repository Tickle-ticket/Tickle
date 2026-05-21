package com.ssafy.tickle.blacklist.presentation.dto;

import com.ssafy.tickle.ai.presentation.dto.AiInferenceCallbackRequest.InferenceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Cloudflare Turnstile CAPTCHA 검증 요청입니다.
 *
 * @param recordId   AI 서버의 1차 봇 판별 결과 식별자
 * @param success    FE CAPTCHA 성공 여부
 * @param token      Cloudflare Turnstile 응답 토큰
 * @param type       CAPTCHA가 발생한 플로우 유형
 * @param eventId    이벤트 ID
 * @param scheduleId 회차 ID
 * @param eventDate  이벤트 날짜
 * @param createdAt  FE 이벤트 생성 시각
 */
public record CaptchaVerificationRequest(
        @NotBlank(message = "recordId는 필수입니다.")
        @Size(max = 128, message = "recordId는 128자를 초과할 수 없습니다.")
        String recordId,

        @NotNull(message = "success는 필수입니다.")
        Boolean success,

        @NotBlank(message = "token은 필수입니다.")
        @Size(max = 2048, message = "token은 2048자를 초과할 수 없습니다.")
        String token,

        @NotNull(message = "type은 필수입니다.")
        InferenceType type,

        Long eventId,

        Long scheduleId,

        LocalDate eventDate,

        @NotNull(message = "createdAt은 필수입니다.")
        Instant createdAt
) {
}
