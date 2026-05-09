package com.ssafy.tickle.cancellation.presentation.dto;

import com.ssafy.tickle.common.domain.SeatGrade;
import com.ssafy.tickle.seat.domain.SessionSeat;

import java.math.BigDecimal;

/**
 * 예매 대기 페이지용 개별 좌석 응답 DTO입니다.
 *
 * @param sessionSeatId 회차 좌석 식별자
 * @param eventSeatId 공연 좌석 식별자
 * @param rowLabel 행 라벨
 * @param seatNumber 좌석 번호
 * @param seatLabel 좌석 표기명
 * @param saleStatus 현재 판매 상태
 * @param priceGrade 좌석 가격 등급
 * @param price 좌석 가격
 * @param waitingCount 해당 좌석 활성 예매 대기 인원 수
 * @param waitable 요청 사용자의 해당 좌석 예매 대기 신청 가능 여부
 */
public record CancellationWaitSeatItemResponse(
        Long sessionSeatId,
        Long eventSeatId,
        String rowLabel,
        String seatNumber,
        String seatLabel,
        SessionSeat.SaleStatus saleStatus,
        SeatGrade priceGrade,
        BigDecimal price,
        long waitingCount,
        boolean waitable
) {

    /**
     * 회차 좌석 엔티티와 예매 대기 현황으로 좌석 응답을 생성합니다.
     *
     * @param sessionSeat 회차 좌석 엔티티
     * @param waitingCount 해당 좌석의 활성 예매 대기 인원 수
     * @param waitable 요청 사용자의 해당 좌석 예매 대기 신청 가능 여부
     * @return 예매 대기 좌석 응답
     */
    public static CancellationWaitSeatItemResponse of(
            SessionSeat sessionSeat,
            long waitingCount,
            boolean waitable
    ) {
        var eventSeat = sessionSeat.getEventSeat();
        return new CancellationWaitSeatItemResponse(
                sessionSeat.getId(),
                eventSeat.getId(),
                eventSeat.getRowLabel(),
                eventSeat.getSeatNumber(),
                eventSeat.getSeatLabel(),
                sessionSeat.getSaleStatus(),
                eventSeat.getEventPricePolicy().getPriceGrade(),
                eventSeat.getEventPricePolicy().getPriceAmount(),
                waitingCount,
                waitable
        );
    }
}
