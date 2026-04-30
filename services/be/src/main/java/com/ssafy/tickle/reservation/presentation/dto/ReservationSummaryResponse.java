package com.ssafy.tickle.reservation.presentation.dto;

import com.ssafy.tickle.reservation.domain.Booking;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * 예매 목록 조회 시 반환되는 개별 예매 요약 응답 DTO입니다.
 *
 * @param bookingId       예매 식별자
 * @param bookingNo       예매 번호
 * @param bookingStatus   예매 상태
 * @param eventTitle      공연 제목
 * @param sessionNo       회차 번호
 * @param sessionStartAt  회차 시작 시각
 * @param venueName       공연장명
 * @param ticketCount     티켓 수량
 * @param totalPaidAmount 총 결제 금액
 * @param createdAt       예매 시각
 */
public record ReservationSummaryResponse(
        Long bookingId,
        String bookingNo,
        String bookingStatus,
        String eventTitle,
        Integer sessionNo,
        Instant sessionStartAt,
        String venueName,
        Integer ticketCount,
        BigDecimal totalPaidAmount,
        Instant createdAt
) {

    /**
     * Booking 엔티티를 요약 응답 DTO로 변환합니다.
     *
     * @param booking 예매 엔티티
     * @return 요약 응답
     */
    public static ReservationSummaryResponse from(Booking booking) {
        return new ReservationSummaryResponse(
                booking.getId(),
                booking.getBookingNo(),
                booking.getBookingStatus().name(),
                booking.getSession().getEvent().getTitle(),
                booking.getSession().getSessionNo(),
                booking.getSession().getStartAt(),
                booking.getSession().getEvent().getVenue().getVenueName(),
                booking.getTicketCount(),
                booking.getTotalPaidAmount(),
                booking.getCreatedAt()
        );
    }
}
