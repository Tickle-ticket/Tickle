package com.ssafy.tickle.reservation.presentation.dto;

import com.ssafy.tickle.common.domain.SeatGrade;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.seat.domain.SessionSeat;

import java.math.BigDecimal;
import java.util.List;

/**
 * 권종 선택 옵션 조회 응답 DTO입니다.
 *
 * @param eventId 공연 식별자
 * @param sessionId 회차 식별자
 * @param userId 사용자 식별자
 * @param currencyCode 통화 코드
 * @param totalTicketPriceAmount 좌석 기본 티켓 가격 합계
 * @param seats 좌석별 권종 옵션 목록
 */
public record BookingOptionsResponse(
        Long eventId,
        Long sessionId,
        Long userId,
        String currencyCode,
        BigDecimal totalTicketPriceAmount,
        List<BookingSeatOptionResponse> seats
) {
    /**
     * 권종 선택 옵션 조회 응답을 생성합니다.
     *
     * @param eventId 공연 식별자
     * @param sessionId 회차 식별자
     * @param userId 사용자 식별자
     * @param currencyCode 통화 코드
     * @param totalTicketPriceAmount 좌석 기본 티켓 가격 합계
     * @param seats 좌석별 권종 옵션 목록
     * @return 권종 옵션 응답
     */
    public static BookingOptionsResponse from(
            Long eventId,
            Long sessionId,
            Long userId,
            String currencyCode,
            BigDecimal totalTicketPriceAmount,
            List<BookingSeatOptionResponse> seats
    ) {
        return new BookingOptionsResponse(eventId, sessionId, userId, currencyCode, totalTicketPriceAmount, seats);
    }

    /**
     * 좌석별 권종 옵션 응답입니다.
     *
     * @param sessionSeatId 회차 좌석 식별자
     * @param seatLabel 좌석 표시명
     * @param rowLabel 행 라벨
     * @param seatNumber 좌석 번호
     * @param eventPricePolicyId 가격 정책 식별자
     * @param priceGrade 가격 등급
     * @param priceAmount 기본 가격
     * @param discountInfo 할인 옵션 목록
     */
    public record BookingSeatOptionResponse(
            Long sessionSeatId,
            String seatLabel,
            String rowLabel,
            String seatNumber,
            Long eventPricePolicyId,
            SeatGrade priceGrade,
            BigDecimal priceAmount,
            List<DiscountInfoResponse> discountInfo
    ) {

        /**
         * 회차 좌석 엔티티를 응답 DTO로 변환합니다.
         *
         * @param sessionSeat 회차 좌석
         * @return 좌석별 권종 옵션 응답
         */
        public static BookingSeatOptionResponse from(SessionSeat sessionSeat) {
            var eventSeat = sessionSeat.getEventSeat();
            var pricePolicy = eventSeat.getEventPricePolicy();
            return new BookingSeatOptionResponse(
                    sessionSeat.getId(),
                    eventSeat.getSeatLabel(),
                    eventSeat.getRowLabel(),
                    eventSeat.getSeatNumber(),
                    pricePolicy.getId(),
                    pricePolicy.getPriceGrade(),
                    pricePolicy.getPriceAmount(),
                    pricePolicy.getDiscountInfo().stream()
                            .map(DiscountInfoResponse::from)
                            .toList()
            );
        }
    }

    /**
     * 할인 옵션 응답입니다.
     *
     * @param discountName 할인명
     * @param discountRate 할인율
     * @param ticketPriceAmount 할인/권종 적용 후 티켓 가격
     */
    public record DiscountInfoResponse(
            String discountName,
            BigDecimal discountRate,
            BigDecimal ticketPriceAmount
    ) {

        /**
         * 가격 정책 할인 정보를 응답 DTO로 변환합니다.
         *
         * @param discountInfo 할인 정보
         * @return 할인 옵션 응답
         */
        public static DiscountInfoResponse from(EventPricePolicy.DiscountInfo discountInfo) {
            return new DiscountInfoResponse(
                    discountInfo.discountName(),
                    discountInfo.discountRate(),
                    discountInfo.actualPriceAmount()
            );
        }
    }
}
