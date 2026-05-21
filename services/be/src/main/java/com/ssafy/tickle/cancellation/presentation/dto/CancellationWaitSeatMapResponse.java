package com.ssafy.tickle.cancellation.presentation.dto;

import java.util.List;

/**
 * 예매 대기 페이지용 회차 좌석 응답 DTO입니다.
 *
 * @param venueId 공연장 식별자
 * @param sections 구역별 좌석 목록
 */
public record CancellationWaitSeatMapResponse(
        Long venueId,
        List<CancellationWaitSeatSectionResponse> sections
) {
}
