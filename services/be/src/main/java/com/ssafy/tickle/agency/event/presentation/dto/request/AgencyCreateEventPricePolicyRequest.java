package com.ssafy.tickle.agency.event.presentation.dto.request;

import com.ssafy.tickle.common.domain.SeatGrade;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * 공연 가격 정책 요청입니다.
 *
 * @param priceGrade 가격 등급
 * @param priceAmount 기본 가격
 * @param discountInfo 할인 정보 목록
 * @param currencyCode 통화 코드
 * @param displayOrder 노출 순서
 */
public record AgencyCreateEventPricePolicyRequest(
        @NotNull(message = "priceGrade는 필수입니다.")
        SeatGrade priceGrade,

        @NotNull(message = "priceAmount는 필수입니다.")
        @DecimalMin(value = "0.0", inclusive = true, message = "priceAmount는 0 이상이어야 합니다.")
        BigDecimal priceAmount,

        @NotNull(message = "discountInfo는 필수입니다.")
        List<@Valid DiscountInfoRequest> discountInfo,

        @NotBlank(message = "currencyCode는 필수입니다.")
        @Size(min = 3, max = 3, message = "currencyCode는 3자리여야 합니다.")
        String currencyCode,

        @NotNull(message = "displayOrder는 필수입니다.")
        @Min(value = 0, message = "displayOrder는 0 이상이어야 합니다.")
        Integer displayOrder
) {
    /**
     * 할인 정보 요청입니다.
     *
     * @param discountName 할인 정보 이름
     * @param discountRate 할인율
     * @param actualPriceAmount 실제 가격
     */
    public record DiscountInfoRequest(
            @NotBlank(message = "discountName은 필수입니다.")
            @Size(max = 50, message = "discountName은 50자 이하여야 합니다.")
            String discountName,

            @NotNull(message = "discountRate는 필수입니다.")
            @DecimalMin(value = "0.0", inclusive = true, message = "discountRate는 0 이상이어야 합니다.")
            @DecimalMax(value = "100.0", inclusive = true, message = "discountRate는 100 이하여야 합니다.")
            java.math.BigDecimal discountRate,

            @NotNull(message = "actualPriceAmount는 필수입니다.")
            @DecimalMin(value = "0.0", inclusive = true, message = "actualPriceAmount는 0 이상이어야 합니다.")
            BigDecimal actualPriceAmount
    ) {
    }
}
