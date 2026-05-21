package com.ssafy.tickle.reservation.infrastructure.messaging.model;

import org.springframework.context.ApplicationEvent;

import java.time.Instant;
import java.util.List;

/**
 * 예매 취소 도메인 이벤트입니다.
 *
 * <p>트랜잭션 커밋 후 {@code BookingCancelEventListener}가 Kafka 메시지를 발행한다.
 * DRAFT 취소는 Kafka 발행 불필요(환불 없음)하므로 {@code requiresKafka = false}로 설정한다.</p>
 */
public class BookingCancelledEvent extends ApplicationEvent {

    private final Long bookingId;
    private final Long userId;
    private final List<Long> sessionSeatIds;
    private final Instant cancelledAt;
    private final boolean requiresKafka;

    /**
     * 예매 취소 이벤트를 생성합니다.
     *
     * @param source         이벤트 발행 주체
     * @param bookingId      취소된 예매 식별자
     * @param userId         요청한 사용자 식별자
     * @param sessionSeatIds 해제할 회차 좌석 식별자 목록
     * @param cancelledAt    취소 시각
     * @param requiresKafka  Kafka 발행 필요 여부 (DRAFT 취소는 false)
     */
    public BookingCancelledEvent(
            Object source,
            Long bookingId,
            Long userId,
            List<Long> sessionSeatIds,
            Instant cancelledAt,
            boolean requiresKafka
    ) {
        super(source);
        this.bookingId = bookingId;
        this.userId = userId;
        this.sessionSeatIds = sessionSeatIds;
        this.cancelledAt = cancelledAt;
        this.requiresKafka = requiresKafka;
    }

    public Long getBookingId() { return bookingId; }
    public Long getUserId() { return userId; }
    public List<Long> getSessionSeatIds() { return sessionSeatIds; }
    public Instant getCancelledAt() { return cancelledAt; }
    public boolean isRequiresKafka() { return requiresKafka; }
}
