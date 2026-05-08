package com.ssafy.tickle.reservation.presentation.dto;

import java.util.List;

/**
 * 예매 목록 조회 응답 DTO입니다.
 *
 * @param items 예매 요약 목록
 */
public record ReservationListResponse(
        List<ReservationSummaryResponse> items
) {
}
