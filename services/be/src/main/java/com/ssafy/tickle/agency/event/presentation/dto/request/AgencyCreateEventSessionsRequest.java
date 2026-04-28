package com.ssafy.tickle.agency.event.presentation.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * 기획사 공연 회차 등록 요청입니다.
 *
 * @param sessions 회차 목록
 */
public record AgencyCreateEventSessionsRequest(
        @NotEmpty(message = "sessions는 하나 이상 필요합니다.")
        List<@Valid AgencyCreateEventSessionRequest> sessions
) {
}
