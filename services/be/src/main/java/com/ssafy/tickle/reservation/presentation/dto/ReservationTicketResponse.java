package com.ssafy.tickle.reservation.presentation.dto;

import com.ssafy.tickle.reservation.domain.BookingTicket;

import java.math.BigDecimal;

/**
 * 예매 상세 조회 시 포함되는 개별 티켓 응답 DTO입니다.
 *
 * @param ticketId          티켓 식별자
 * @param ticketNo          외부 노출 티켓 번호
 * @param ticketStatus      티켓 상태
 * @param sectionName       구역명
 * @param rowLabel          열
 * @param seatNumber        번호
 * @param seatLabel         좌석 표시명
 * @param actualPriceAmount 실판매가
 * @param serviceFeeAmount  수수료
 * @param finalPriceAmount  최종 결제 금액
 */
public record ReservationTicketResponse(
        Long ticketId,
        String ticketNo,
        String ticketStatus,
        String sectionName,
        String rowLabel,
        String seatNumber,
        String seatLabel,
        BigDecimal actualPriceAmount,
        BigDecimal serviceFeeAmount,
        BigDecimal finalPriceAmount
) {

    /**
     * BookingTicket 엔티티를 티켓 응답 DTO로 변환합니다.
     *
     * @param ticket 예매 티켓 엔티티
     * @return 티켓 응답
     */
    public static ReservationTicketResponse from(BookingTicket ticket) {
        return new ReservationTicketResponse(
                ticket.getId(),
                ticket.getTicketNo(),
                ticket.getTicketStatus().name(),
                ticket.getSessionSeat().getEventSeat().getEventSection().getSectionName(),
                ticket.getSessionSeat().getEventSeat().getRowLabel(),
                ticket.getSessionSeat().getEventSeat().getSeatNumber(),
                ticket.getSessionSeat().getEventSeat().getSeatLabel(),
                ticket.getActualPriceAmount(),
                ticket.getServiceFeeAmount(),
                ticket.getFinalPriceAmount()
        );
    }
}
