package com.ssafy.tickle.reservation.infrastructure.messaging.listener;

import com.ssafy.tickle.reservation.infrastructure.messaging.model.BookingCancelMessage;
import com.ssafy.tickle.reservation.infrastructure.messaging.model.BookingCancelledEvent;
import com.ssafy.tickle.reservation.infrastructure.messaging.producer.BookingCancelProducer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * 예매 취소 이벤트 리스너입니다.
 *
 * <p>트랜잭션 커밋 후 Kafka 취소 메시지를 발행한다.
 * DRAFT 취소는 환불이 없으므로 Kafka 발행을 건너뛴다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BookingCancelEventListener {

    private final BookingCancelProducer bookingCancelProducer;

    /**
     * 예매 취소 이벤트를 수신하여 Kafka 메시지를 발행합니다.
     *
     * @param event 예매 취소 이벤트
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(BookingCancelledEvent event) {
        if (!event.isRequiresKafka()) {
            log.info("DRAFT 예매 취소 - Kafka 발행 생략: bookingId={}", event.getBookingId());
            return;
        }

        bookingCancelProducer.publish(new BookingCancelMessage(
                event.getBookingId(),
                event.getUserId(),
                event.getSessionSeatIds(),
                event.getCancelledAt()
        ));
    }
}
