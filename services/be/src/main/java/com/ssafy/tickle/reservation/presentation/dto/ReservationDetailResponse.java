package com.ssafy.tickle.reservation.presentation.dto;

import com.ssafy.tickle.reservation.domain.Booking;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * 예매 상세 조회 응답 DTO입니다.
 *
 * @param bookingId       예매 식별자
 * @param bookingNo       예매 번호
 * @param bookingStatus   예매 상태
 * @param eventTitle      공연 제목
 * @param sessionNo       회차 번호
 * @param sessionStartAt  회차 시작 시각
 * @param venueName       공연장명
 * @param ticketCount     티켓 수량
 * @param totalPaymentAmount 총 결제 금액
 * @param createdAt       예매 시각
 * @param tickets         티켓 목록
 */
public record ReservationDetailResponse(
        Long bookingId,
        String bookingNo,
        String bookingStatus,
        String eventTitle,
        Integer sessionNo,
        Instant sessionStartAt,
        String venueName,
        Integer ticketCount,
        BigDecimal totalPaymentAmount,
        Instant createdAt,
        List<ReservationTicketResponse> tickets
) {

    /**
     * Booking 엔티티와 티켓 목록을 상세 응답 DTO로 변환합니다.
     *
     * @param booking 예매 엔티티
     * @param tickets 변환된 티켓 응답 목록
     * @return 상세 응답
     */
    public static ReservationDetailResponse from(Booking booking, List<ReservationTicketResponse> tickets) {
        return new ReservationDetailResponse(
                booking.getId(),
                booking.getBookingNo(),
                booking.getBookingStatus().name(),
                booking.getSession().getEvent().getTitle(),
                booking.getSession().getSessionNo(),
                booking.getSession().getStartAt(),
                booking.getSession().getEvent().getVenue().getVenueName(),
                booking.getTicketCount(),
                booking.getTotalPaymentAmount(),
                booking.getCreatedAt(),
                tickets
        );
    }
}
