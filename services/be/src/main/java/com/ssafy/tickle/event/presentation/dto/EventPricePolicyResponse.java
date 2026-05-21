package com.ssafy.tickle.event.presentation.dto;

import com.ssafy.tickle.common.domain.SeatGrade;
import com.ssafy.tickle.event.domain.EventPricePolicy;

import java.math.BigDecimal;
import java.util.List;

/**
 * 이벤트 가격 정책 응답 DTO입니다.
 *
 * @param eventPricePolicyId 가격 정책 식별자
 * @param priceGrade 가격 등급
 * @param priceAmount 기본 가격
 * @param discountInfo 할인 정보 목록
 * @param currencyCode 통화 코드
 * @param displayOrder 노출 순서
 */
public record EventPricePolicyResponse(
        Long eventPricePolicyId,
        SeatGrade priceGrade,
        BigDecimal priceAmount,
        List<DiscountInfoResponse> discountInfo,
        String currencyCode,
        Integer displayOrder
) {
    /**
     * 가격 정책의 할인 정보 응답입니다.
     *
     * @param discountName 할인 정보 이름
     * @param discountRate 할인율
     * @param actualPriceAmount 실제 가격
     */
    public record DiscountInfoResponse(
            String discountName,
            BigDecimal discountRate,
            BigDecimal actualPriceAmount
    ) {
        public static DiscountInfoResponse from(EventPricePolicy.DiscountInfo discountInfo) {
            return new DiscountInfoResponse(
                    discountInfo.discountName(),
                    discountInfo.discountRate(),
                    discountInfo.actualPriceAmount()
            );
        }
    }

    /**
     * 이벤트 가격 정책을 응답 DTO로 변환합니다.
     *
     * @param eventPricePolicy 이벤트 가격 정책 엔티티
     * @return 이벤트 가격 정책 응답
     */
    public static EventPricePolicyResponse from(EventPricePolicy eventPricePolicy) {
        List<DiscountInfoResponse> discountInfo = (eventPricePolicy.getDiscountInfo() == null
                ? List.<EventPricePolicy.DiscountInfo>of()
                : eventPricePolicy.getDiscountInfo())
                .stream()
                .map(DiscountInfoResponse::from)
                .toList();

        return new EventPricePolicyResponse(
                eventPricePolicy.getId(),
                eventPricePolicy.getPriceGrade(),
                eventPricePolicy.getPriceAmount(),
                discountInfo,
                eventPricePolicy.getCurrencyCode(),
                eventPricePolicy.getDisplayOrder()
        );
    }
}
