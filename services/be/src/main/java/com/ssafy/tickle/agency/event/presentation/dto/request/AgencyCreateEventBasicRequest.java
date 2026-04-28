package com.ssafy.tickle.agency.event.presentation.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

/**
 * 기획사 공연 기본정보 등록 요청입니다.
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
 */
public record AgencyCreateEventBasicRequest(
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
        String notice
) {
}
