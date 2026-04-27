package com.ssafy.tickle.event.presentation.dto.agency;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 공연 좌석 매핑 요청입니다.
 *
 * @param venueSeatId 공연장 좌석 식별자
 * @param priceGrade 가격 등급
 * @param audienceType 관람 대상 유형
 */
public record AgencyCreateEventSeatRequest(
        @NotNull(message = "venueSeatId는 필수입니다.")
        Long venueSeatId,

        @NotBlank(message = "priceGrade는 필수입니다.")
        @Size(max = 30, message = "priceGrade는 30자 이하여야 합니다.")
        String priceGrade,

        @NotBlank(message = "audienceType은 필수입니다.")
        @Size(max = 30, message = "audienceType은 30자 이하여야 합니다.")
        String audienceType
) {
}
