package com.ssafy.tickle.seat.presentation.dto;

import com.ssafy.tickle.common.domain.SeatGrade;
import com.ssafy.tickle.seat.domain.SessionSeat;

import java.math.BigDecimal;

/**
 * 구역 내 개별 좌석 상태 응답 DTO입니다.
 *
 * @param sessionSeatId    회차 좌석 식별자 (선점 요청 시 사용)
 * @param eventSeatId      이벤트 좌석 식별자
 * @param rowLabel         행 라벨 (예: 1, A)
 * @param seatNumber       좌석 번호 (예: 1, 2, 3)
 * @param seatLabel        좌석 표기명 (예: A-1-1)
 * @param saleStatus       현재 판매 상태
 * @param priceGrade       좌석 가격 등급
 * @param price            좌석 가격
 */
public record SeatItemResponse(
        Long sessionSeatId,
        Long eventSeatId,
        String rowLabel,
        String seatNumber,
        String seatLabel,
        SessionSeat.SaleStatus saleStatus,
        SeatGrade priceGrade,
        BigDecimal price
) {

    /**
     * SessionSeat 엔티티로부터 응답 DTO를 생성합니다.
     *
     * @param sessionSeat 회차 좌석 엔티티
     * @return 좌석 응답 DTO
     */
    public static SeatItemResponse from(SessionSeat sessionSeat) {
        var eventSeat = sessionSeat.getEventSeat();
        return new SeatItemResponse(
                sessionSeat.getId(),
                eventSeat.getId(),
                eventSeat.getRowLabel(),
                eventSeat.getSeatNumber(),
                eventSeat.getSeatLabel(),
                sessionSeat.getSaleStatus(),
                eventSeat.getEventPricePolicy().getPriceGrade(),
                eventSeat.getEventPricePolicy().getPriceAmount()
        );
    }
}
