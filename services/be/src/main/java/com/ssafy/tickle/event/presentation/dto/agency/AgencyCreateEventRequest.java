package com.ssafy.tickle.event.presentation.dto.agency;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

/**
 * 기획사 공연 생성 요청입니다.
 *
 * @param organizerId 기획사 식별자
 * @param venueId 공연장 식별자
 * @param categoryId 카테고리 식별자
 * @param title 공연명
 * @param salesStartAt 공연 판매 시작 시각
 * @param salesEndAt 공연 판매 종료 시각
 * @param eventStartAt 공연 시작 시각
 * @param eventEndAt 공연 종료 시각
 * @param tags 태그 목록
 * @param notice 공지사항
 * @param pricePolicies 가격 정책 목록
 * @param sessions 회차 목록
 * @param seats 공연 좌석/가격정책 매핑 목록
 */
public record AgencyCreateEventRequest(
        @NotNull(message = "organizerId는 필수입니다.")
        Long organizerId,

        @NotNull(message = "venueId는 필수입니다.")
        Long venueId,

        @NotNull(message = "categoryId는 필수입니다.")
        Long categoryId,

        @NotBlank(message = "title은 필수입니다.")
        @Size(max = 255, message = "title은 255자 이하여야 합니다.")
        String title,

        @NotNull(message = "salesStartAt은 필수입니다.")
        Instant salesStartAt,

        @NotNull(message = "salesEndAt은 필수입니다.")
        Instant salesEndAt,

        @NotNull(message = "eventStartAt은 필수입니다.")
        Instant eventStartAt,

        @NotNull(message = "eventEndAt은 필수입니다.")
        Instant eventEndAt,

        List<String> tags,

        @Size(max = 10000, message = "notice는 10000자 이하여야 합니다.")
        String notice,

        @NotEmpty(message = "pricePolicies는 하나 이상 필요합니다.")
        List<@Valid AgencyCreateEventPricePolicyRequest> pricePolicies,

        @NotEmpty(message = "sessions는 하나 이상 필요합니다.")
        List<@Valid AgencyCreateEventSessionRequest> sessions,

        @NotEmpty(message = "seats는 하나 이상 필요합니다.")
        List<@Valid AgencyCreateEventSeatRequest> seats
) {
}
