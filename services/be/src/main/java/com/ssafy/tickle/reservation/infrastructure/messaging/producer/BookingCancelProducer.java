package com.ssafy.tickle.reservation.infrastructure.messaging.producer;

import com.ssafy.tickle.reservation.infrastructure.messaging.mapper.BookingCancelMessageMapper;
import com.ssafy.tickle.reservation.infrastructure.messaging.model.BookingCancelMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.ExecutionException;

/**
 * 예매 취소 이벤트를 Kafka로 발행합니다.
 */
@Component
@RequiredArgsConstructor
public class BookingCancelProducer {

    private static final String TOPIC = "booking.cancel.request";

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final BookingCancelMessageMapper bookingCancelMessageMapper;

    /**
     * 예매 취소 이벤트를 Kafka에 발행합니다.
     *
     * <p>send().get()으로 브로커 ack까지 확인해야 취소 API가 적재 실패를 감지할 수 있다.</p>
     *
     * @param message 예매 취소 메시지
     */
    public void publish(BookingCancelMessage message) {
        try {
            kafkaTemplate.send(
                    TOPIC,
                    message.bookingId().toString(),
                    bookingCancelMessageMapper.toPayload(message)
            ).get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("예매 취소 Kafka 적재가 인터럽트되었습니다.", e);
        } catch (ExecutionException e) {
            throw new IllegalStateException("예매 취소 Kafka 적재에 실패했습니다.", e);
        }
    }
}
