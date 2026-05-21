package com.ssafy.tickle.seat.presentation.dto;

import com.ssafy.tickle.seat.domain.EventSection;

import java.util.List;

/**
 * 공연 구역별 좌석 목록 응답 DTO입니다.
 *
 * @param sectionId    구역 식별자
 * @param sectionName  구역명 (예: A구역)
 * @param displayOrder 구역 표시 순서
 * @param seats        해당 구역의 좌석 목록
 */
public record SeatSectionResponse(
        Long sectionId,
        String sectionName,
        Integer displayOrder,
        List<SeatItemResponse> seats
) {

    /**
     * EventSection과 해당 구역 좌석 목록으로 응답 DTO를 생성합니다.
     *
     * @param section 구역 엔티티
     * @param seats   해당 구역 좌석 응답 목록
     * @return 구역별 좌석 응답 DTO
     */
    public static SeatSectionResponse of(EventSection section, List<SeatItemResponse> seats) {
        return new SeatSectionResponse(
                section.getId(),
                section.getSectionName(),
                section.getDisplayOrder(),
                seats
        );
    }
}
