package com.ssafy.tickle.agency.event.presentation.dto.response;

import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.seat.domain.EventSeat;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 기획사 공연 좌석 응답입니다.
 *
 * @param eventId 공연 식별자
 * @param venueId 공연장 식별자
 * @param seats 가격 등급별 좌석 그룹
 */
public record AgencyEventSeatResponse(
        Long eventId,
        Long venueId,
        List<SeatGroup> seats
) {

    /**
     * 공연 좌석 엔티티를 좌석 응답으로 변환합니다.
     *
     * @param event 공연 엔티티
     * @param seats 공연 좌석 목록
     * @return 공연 좌석 응답
     */
    public static AgencyEventSeatResponse from(
            Event event,
            List<EventSeat> seats
    ) {
        Map<String, List<Long>> seatIdsByPriceGrade = new LinkedHashMap<>();
        for (EventSeat seat : seats) {
            seatIdsByPriceGrade
                    .computeIfAbsent(seat.getEventPricePolicy().getPriceGrade().name(), key -> new java.util.ArrayList<>())
                    .add(seat.getId());
        }

        return new AgencyEventSeatResponse(
                event.getId(),
                event.getVenue().getId(),
                seatIdsByPriceGrade.entrySet().stream()
                        .map(entry -> new SeatGroup(entry.getKey(), entry.getValue()))
                        .toList()
        );
    }

    /**
     * 가격 등급별 좌석 그룹 응답입니다.
     *
     * @param priceGrade 가격 등급
     * @param seatIds 해당 가격 등급에 속한 공연 좌석 식별자 목록
     */
    public record SeatGroup(
            String priceGrade,
            List<Long> seatIds
    ) {
    }
}
