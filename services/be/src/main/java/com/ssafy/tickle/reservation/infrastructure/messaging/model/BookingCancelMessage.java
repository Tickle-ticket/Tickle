package com.ssafy.tickle.reservation.infrastructure.messaging.model;

import java.time.Instant;
import java.util.List;

/**
 * 예매 취소 이벤트 Kafka 메시지 모델입니다.
 *
 * <p>예매 취소 시 발행되며, 좌석 해제 및 환불 처리를 트리거한다.</p>
 *
 * @param bookingId      취소된 예매 ID
 * @param userId         요청한 사용자 ID
 * @param sessionSeatIds 해제할 회차 좌석 ID 목록
 * @param cancelledAt    취소 시각
 */
public record BookingCancelMessage(
        Long bookingId,
        Long userId,
        List<Long> sessionSeatIds,
        Instant cancelledAt
) {
}
