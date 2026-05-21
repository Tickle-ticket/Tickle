package com.ssafy.tickle.cancellation.presentation.dto;

import com.ssafy.tickle.seat.domain.EventSection;

import java.util.List;

/**
 * 예매 대기 페이지용 구역별 좌석 응답 DTO입니다.
 *
 * @param sectionId 구역 식별자
 * @param sectionName 구역명
 * @param displayOrder 구역 표시 순서
 * @param seats 해당 구역의 좌석 목록
 */
public record CancellationWaitSeatSectionResponse(
        Long sectionId,
        String sectionName,
        Integer displayOrder,
        List<CancellationWaitSeatItemResponse> seats
) {

    /**
     * 구역 엔티티와 좌석 목록으로 예매 대기 구역 응답을 생성합니다.
     *
     * @param section 구역 엔티티
     * @param seats 구역에 포함된 좌석별 예매 대기 현황
     * @return 예매 대기 구역 응답
     */
    public static CancellationWaitSeatSectionResponse of(
            EventSection section,
            List<CancellationWaitSeatItemResponse> seats
    ) {
        return new CancellationWaitSeatSectionResponse(
                section.getId(),
                section.getSectionName(),
                section.getDisplayOrder(),
                seats
        );
    }
}
