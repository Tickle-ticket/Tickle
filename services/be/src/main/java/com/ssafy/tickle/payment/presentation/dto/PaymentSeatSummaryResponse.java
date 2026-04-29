package com.ssafy.tickle.payment.presentation.dto;

import com.ssafy.tickle.reservation.domain.BookingTicket;

import java.math.BigDecimal;

/**
 * 결제 응답용 좌석 요약 DTO입니다.
 *
 * @param sessionSeatId 회차 좌석 식별자
 * @param seatLabel 좌석 표시명
 * @param rowLabel 행 라벨
 * @param seatNumber 좌석 번호
 * @param ticketPriceAmount 좌석의 기본 티켓 가격 또는 선택된 권종 가격
 * @param serviceFeeAmount 티켓 가격 기준 5%로 계산한 수수료
 * @param finalPriceAmount 티켓 가격과 수수료를 합친 최종 결제 금액
 */
public record PaymentSeatSummaryResponse(
        Long sessionSeatId,
        String seatLabel,
        String rowLabel,
        String seatNumber,
        BigDecimal ticketPriceAmount,
        BigDecimal serviceFeeAmount,
        BigDecimal finalPriceAmount
) {

    /**
     * BookingTicket을 응답 DTO로 변환합니다.
     *
     * @param ticket 예매 티켓
     * @return 좌석 요약 응답
     */
    public static PaymentSeatSummaryResponse from(BookingTicket ticket) {
        return new PaymentSeatSummaryResponse(
                ticket.getSessionSeat().getId(),
                ticket.getSessionSeat().getEventSeat().getSeatLabel(),
                ticket.getSessionSeat().getEventSeat().getRowLabel(),
                ticket.getSessionSeat().getEventSeat().getSeatNumber(),
                ticket.getTicketPriceAmount(),
                ticket.getServiceFeeAmount(),
                ticket.getFinalPriceAmount()
        );
    }
}
