package com.ssafy.tickle.event.presentation.dto.agency;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * 공연 가격 정책 요청입니다.
 *
 * @param priceGrade 가격 등급
 * @param audienceType 관람 대상 유형
 * @param salePriceAmount 판매 금액
 * @param currencyCode 통화 코드
 * @param displayOrder 노출 순서
 */
public record AgencyCreateEventPricePolicyRequest(
        @NotBlank(message = "priceGrade는 필수입니다.")
        @Size(max = 30, message = "priceGrade는 30자 이하여야 합니다.")
        String priceGrade,

        @NotBlank(message = "audienceType은 필수입니다.")
        @Size(max = 30, message = "audienceType은 30자 이하여야 합니다.")
        String audienceType,

        @NotNull(message = "salePriceAmount는 필수입니다.")
        @DecimalMin(value = "0.0", inclusive = true, message = "salePriceAmount는 0 이상이어야 합니다.")
        BigDecimal salePriceAmount,

        @NotBlank(message = "currencyCode는 필수입니다.")
        @Size(min = 3, max = 3, message = "currencyCode는 3자리여야 합니다.")
        String currencyCode,

        @NotNull(message = "displayOrder는 필수입니다.")
        @Min(value = 0, message = "displayOrder는 0 이상이어야 합니다.")
        Integer displayOrder
) {
}
