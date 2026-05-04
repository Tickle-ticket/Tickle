package com.ssafy.tickle.seat.application;

import com.ssafy.tickle.seat.domain.SeatStatusChangedEvent;
import com.ssafy.tickle.seat.infrastructure.sse.SeatSseEmitterRepository;
import com.ssafy.tickle.seat.presentation.dto.SeatStatusMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;

/**
 * 좌석 상태 변경을 SSE로 브로드캐스트하는 서비스입니다.
 *
 * <p>{@link SeatStatusChangedEvent}를 트랜잭션 커밋 완료 후 수신하여
 * 해당 회차를 구독 중인 모든 클라이언트에게 변경된 좌석 상태를 Push합니다.
 * 커밋 이전 브로드캐스트를 방지하여 클라이언트가 미커밋 상태를 보는 문제를 차단합니다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SeatBroadcastService {

    private final SeatSseEmitterRepository sseEmitterRepository;

    /**
     * 좌석 상태 변경을 구독자 전체에게 SSE로 Push합니다.
     *
     * <p>트랜잭션 커밋 완료 후에만 실행됩니다 (AFTER_COMMIT).</p>
     *
     * @param event 변경된 좌석 상태 이벤트
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSeatStatusChanged(SeatStatusChangedEvent event) {
        Long scheduleId = event.getScheduleId();
        List<SseEmitter> emitters = sseEmitterRepository.findByScheduleId(scheduleId);
        log.info("[SSE] Attempting to push to {} emitters for scheduleId={}", emitters.size(), scheduleId);

        if (emitters.isEmpty()) {
            return;
        }

        // 일괄 전송으로 변경 (개별 루프 제거)
        SeatStatusMessage message = new SeatStatusMessage(event.getSessionSeatIds(), event.getNewStatus());
        
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().data(message, MediaType.APPLICATION_JSON));
                log.info("[SSE] Push Success → count={} status={}", event.getSessionSeatIds().size(), event.getNewStatus());
            } catch (IOException e) {
                log.warn("[SSE] Push Failed (Removing) → error={}", e.getMessage());
                sseEmitterRepository.remove(scheduleId, emitter);
            }
        }
    }
}
