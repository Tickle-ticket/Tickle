package com.ssafy.tickle.payment.presentation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * 카카오페이 결제 준비 응답 DTO입니다.
 *
 * @param paymentId 내부 결제 식별자
 * @param tid 카카오페이 거래 ID
 * @param nextRedirectAppUrl 앱 리다이렉트 URL
 * @param nextRedirectMobileUrl 모바일 리다이렉트 URL
 * @param nextRedirectPcUrl PC 리다이렉트 URL
 * @param createdAt 결제 준비 시각
 */
public record KakaoPayReadyResponse(
        Long paymentId,
        String tid,
        String nextRedirectAppUrl,
        String nextRedirectMobileUrl,
        String nextRedirectPcUrl,
        Instant createdAt
) {
    private static final ZoneId KOREA_TIME_ZONE = ZoneId.of("Asia/Seoul");

    /**
     * 카카오페이 원본 응답과 내부 결제 ID를 합쳐 API 응답을 생성합니다.
     *
     * @param paymentId 내부 결제 식별자
     * @param response 카카오페이 원본 응답
     * @return API 응답 DTO
     */
    public static KakaoPayReadyResponse from(Long paymentId, KakaoPayReadyApiResponse response) {
        return new KakaoPayReadyResponse(
                paymentId,
                response.tid(),
                response.nextRedirectAppUrl(),
                response.nextRedirectMobileUrl(),
                response.nextRedirectPcUrl(),
                response.createdAt().atZone(KOREA_TIME_ZONE).toInstant()
        );
    }

    /**
     * 카카오페이 ready API 원본 응답 DTO입니다.
     *
     * @param tid 카카오페이 거래 ID
     * @param nextRedirectAppUrl 앱 리다이렉트 URL
     * @param nextRedirectMobileUrl 모바일 리다이렉트 URL
     * @param nextRedirectPcUrl PC 리다이렉트 URL
     * @param createdAt 결제 준비 시각
     */
    public record KakaoPayReadyApiResponse(
            String tid,
            @JsonProperty("next_redirect_app_url")
            String nextRedirectAppUrl,
            @JsonProperty("next_redirect_mobile_url")
            String nextRedirectMobileUrl,
            @JsonProperty("next_redirect_pc_url")
            String nextRedirectPcUrl,
            @JsonProperty("created_at")
            LocalDateTime createdAt
    ) {
    }
}
