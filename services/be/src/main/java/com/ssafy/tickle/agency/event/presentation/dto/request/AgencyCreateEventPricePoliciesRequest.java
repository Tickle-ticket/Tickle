package com.ssafy.tickle.agency.event.presentation.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * 공연 가격 정책 등록 요청입니다.
 *
 * @param pricePolicies 가격 정책 목록
 */
public record AgencyCreateEventPricePoliciesRequest(
        @NotEmpty(message = "pricePolicies는 하나 이상 필요합니다.")
        List<@Valid AgencyCreateEventPricePolicyRequest> pricePolicies
) {
}
