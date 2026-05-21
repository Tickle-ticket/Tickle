package com.ssafy.tickle.reservation.presentation.dto;

import com.ssafy.tickle.reservation.domain.Booking;
import com.ssafy.tickle.reservation.domain.BookingTicket;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.List;

/**
 * 권종 선택을 확정한 뒤 생성된 예매 초안 응답 DTO입니다.
 *
 * <p>이 응답은 아직 결제 완료가 아니라, 다음 결제 단계로 넘어가기 위한
 * 예매 초안 상태를 반환한다.</p>
 *
 * @param bookingId 예매 식별자
 * @param bookingNo 예매 번호
 * @param bookingStatus 예매 상태
 * @param currencyCode 통화 코드
 * @param totalPaymentAmount 총 결제 예정 금액. 좌석별 티켓 가격 합계와 수수료 합계를 합산한 값이다.
 * @param holdExpiresAt 좌석 hold 만료 시각
 * @param seats 좌석별 선택 결과
 */
public record BookingPreorderResponse(
        Long bookingId,
        String bookingNo,
        Booking.Status bookingStatus,
        String currencyCode,
        BigDecimal totalPaymentAmount,
        Instant holdExpiresAt,
        List<BookingPreorderSeatResponse> seats
) {
    /**
     * 예매 초안 응답을 생성합니다.
     *
     * @param booking 예매 초안
     * @param tickets 예매 초안에 포함된 티켓
     * @param discountNameBySeatId 좌석별 선택 권종명
     * @param holdExpiresAt 좌석 hold 만료 시각
     * @return 예매 초안 응답
     */
    public static BookingPreorderResponse from(
            Booking booking,
            List<BookingTicket> tickets,
            Map<Long, String> discountNameBySeatId,
            Instant holdExpiresAt
    ) {
        return new BookingPreorderResponse(
                booking.getId(),
                booking.getBookingNo(),
                booking.getBookingStatus(),
                tickets.getFirst().getSessionSeat().getEventSeat().getEventPricePolicy().getCurrencyCode(),
                booking.getTotalPaymentAmount(),
                holdExpiresAt,
                tickets.stream()
                        .map(ticket -> BookingPreorderSeatResponse.from(
                                ticket,
                                discountNameBySeatId.get(ticket.getSessionSeat().getId())
                        ))
                        .toList()
        );
    }

    /**
     * 예매 초안에 포함된 좌석 하나의 선택 결과를 나타내는 응답 DTO입니다.
     *
     * @param sessionSeatId 회차 좌석 식별자
     * @param seatLabel 좌석 표시명
     * @param discountName 선택한 권종명
     * @param ticketPriceAmount 좌석의 티켓 가격
     * @param serviceFeeAmount 티켓 가격 기준 5% 수수료
     * @param finalPriceAmount 티켓 가격과 수수료를 합친 좌석별 최종 금액
     */
    public record BookingPreorderSeatResponse(
            Long sessionSeatId,
            String seatLabel,
            String discountName,
            BigDecimal ticketPriceAmount,
            BigDecimal serviceFeeAmount,
            BigDecimal finalPriceAmount
    ) {
        /**
         * 좌석 선택 결과를 생성합니다.
         *
         * @param ticket 예매 티켓
         * @param discountName 선택한 권종명
         * @return 좌석 선택 결과
         */
        public static BookingPreorderSeatResponse from(BookingTicket ticket, String discountName) {
            return new BookingPreorderSeatResponse(
                    ticket.getSessionSeat().getId(),
                    ticket.getSessionSeat().getEventSeat().getSeatLabel(),
                    discountName,
                    ticket.getTicketPriceAmount(),
                    ticket.getServiceFeeAmount(),
                    ticket.getFinalPriceAmount()
            );
        }
    }
}
