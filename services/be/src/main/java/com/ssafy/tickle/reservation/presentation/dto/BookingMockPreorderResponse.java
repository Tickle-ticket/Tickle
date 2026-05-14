package com.ssafy.tickle.reservation.presentation.dto;

import com.ssafy.tickle.reservation.domain.Booking;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * 테스트용 목 예매 완료 응답 DTO입니다.
 *
 * @param bookingId 예매 식별자
 * @param bookingNo 예매 번호
 * @param bookingStatus 예매 상태
 * @param currencyCode 통화 코드
 * @param totalPaymentAmount 총 결제 금액
 * @param holdExpiresAt 좌석 hold 만료 시각
 * @param seats 좌석별 선택 결과
 * @param win 요청 좌석에 테스트 당첨 좌석이 포함되어 있는지 여부
 * @param winCount 요청 좌석에 포함된 테스트 당첨 좌석 수
 */
public record BookingMockPreorderResponse(
        Long bookingId,
        String bookingNo,
        Booking.Status bookingStatus,
        String currencyCode,
        BigDecimal totalPaymentAmount,
        Instant holdExpiresAt,
        List<BookingPreorderResponse.BookingPreorderSeatResponse> seats,
        boolean win,
        int winCount
) {
    public static BookingMockPreorderResponse from(BookingPreorderResponse preorder, int winCount) {
        return new BookingMockPreorderResponse(
                preorder.bookingId(),
                preorder.bookingNo(),
                preorder.bookingStatus(),
                preorder.currencyCode(),
                preorder.totalPaymentAmount(),
                preorder.holdExpiresAt(),
                preorder.seats(),
                winCount > 0,
                winCount
        );
    }
}
