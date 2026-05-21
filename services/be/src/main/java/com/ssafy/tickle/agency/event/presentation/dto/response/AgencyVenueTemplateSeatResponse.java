package com.ssafy.tickle.agency.event.presentation.dto.response;

import com.ssafy.tickle.common.domain.SeatGrade;
import com.ssafy.tickle.venue.domain.VenueSeat;

/**
 * 공연 등록용 공연장 좌석 응답입니다.
 *
 * <p>좌석 등급과 표기 정보를 함께 내려줘서 공연 좌석 매핑 기준으로 사용합니다.</p>
 *
 * @param venueSeatId 공연장 좌석 식별자
 * @param rowLabel 열
 * @param seatNumber 번호
 * @param seatLabel 표기명
 * @param seatGrade 좌석 등급
 */
public record AgencyVenueTemplateSeatResponse(
        Long venueSeatId,
        String rowLabel,
        String seatNumber,
        String seatLabel,
        SeatGrade seatGrade
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
                seat.getSeatGrade()
        );
    }
}
