package com.ssafy.tickle.agency.event.presentation.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * 기획사 공연 좌석 등록 요청입니다.
 *
 * @param seats 가격 정책별 공연 좌석 그룹 목록
 */
public record AgencyCreateEventSeatsRequest(
        @NotEmpty(message = "seats는 하나 이상 필요합니다.")
        List<@Valid AgencyCreateEventSeatGroupRequest> seats
) {
}
