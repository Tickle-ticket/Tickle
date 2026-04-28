package com.ssafy.tickle.seat.application;

import com.ssafy.tickle.seat.domain.SeatStatusChangedEvent;
import com.ssafy.tickle.seat.presentation.dto.SeatStatusMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * 좌석 상태 변경을 WebSocket으로 브로드캐스트하는 서비스입니다.
 *
 * <p>{@link SeatStatusChangedEvent}를 트랜잭션 커밋 완료 후 수신하여
 * 해당 회차를 구독 중인 모든 클라이언트에게 변경된 좌석 상태를 Push합니다.
 * 커밋 이전 브로드캐스트를 방지하여 클라이언트가 미커밋 상태를 보는 문제를 차단합니다.</p>
 *
 * <p>구독 토픽: {@code /topic/seats/{scheduleId}}</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SeatBroadcastService {

    private static final String TOPIC_PREFIX = "/topic/seats/";

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 좌석 상태 변경을 구독자 전체에게 Push합니다.
     *
     * <p>트랜잭션 커밋 완료 후에만 실행됩니다 (AFTER_COMMIT).</p>
     *
     * @param event 변경된 좌석 상태 이벤트
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSeatStatusChanged(SeatStatusChangedEvent event) {
        String destination = TOPIC_PREFIX + event.getScheduleId();

        event.getSessionSeatIds().forEach(seatId -> {
            SeatStatusMessage message = new SeatStatusMessage(seatId, event.getNewStatus());
            messagingTemplate.convertAndSend(destination, message);
            log.debug("[WS] Push → {} | seatId={} status={}", destination, seatId, event.getNewStatus());
        });
    }
}
