package com.ssafy.tickle.event.presentation.dto.agency;

import com.ssafy.tickle.venue.domain.VenueSeat;

/**
 * 공연 등록용 공연장 좌석 응답입니다.
 *
 * @param venueSeatId 공연장 좌석 식별자
 * @param rowLabel 열
 * @param seatNumber 번호
 * @param seatLabel 표기명
 * @param seatType 좌석 유형
 */
public record AgencyVenueTemplateSeatResponse(
        Long venueSeatId,
        String rowLabel,
        String seatNumber,
        String seatLabel,
        VenueSeat.SeatType seatType
) {

    /**
     * 공연장 좌석 엔티티를 좌석 응답 DTO로 변환합니다.
     *
     * @param seat 공연장 좌석 엔티티
     * @return 공연장 좌석 응답 DTO
     */
    public static AgencyVenueTemplateSeatResponse from(VenueSeat seat) {
        return new AgencyVenueTemplateSeatResponse(
                seat.getId(),
                seat.getRowLabel(),
                seat.getSeatNumber(),
                seat.getSeatLabel(),
                seat.getSeatType()
        );
    }
}
