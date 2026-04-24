package com.ssafy.tickle.event.presentation.dto;

import com.ssafy.tickle.event.domain.EventPricePolicy;

import java.math.BigDecimal;

/**
 * 이벤트 가격 정책 응답 DTO입니다.
 *
 * @param eventPricePolicyId 가격 정책 식별자
 * @param priceGrade 가격 등급
 * @param audienceType 관람 대상 유형
 * @param salePriceAmount 판매가
 * @param currencyCode 통화 코드
 * @param displayOrder 노출 순서
 */
public record EventPricePolicyResponse(
        Long eventPricePolicyId,
        String priceGrade,
        String audienceType,
        BigDecimal salePriceAmount,
        String currencyCode,
        Integer displayOrder
) {

    /**
     * 이벤트 가격 정책을 응답 DTO로 변환합니다.
     *
     * @param eventPricePolicy 이벤트 가격 정책 엔티티
     * @return 이벤트 가격 정책 응답
     */
    public static EventPricePolicyResponse from(EventPricePolicy eventPricePolicy) {
        return new EventPricePolicyResponse(
                eventPricePolicy.getId(),
                eventPricePolicy.getPriceGrade(),
                eventPricePolicy.getAudienceType(),
                eventPricePolicy.getSalePriceAmount(),
                eventPricePolicy.getCurrencyCode(),
                eventPricePolicy.getDisplayOrder()
        );
    }
}
