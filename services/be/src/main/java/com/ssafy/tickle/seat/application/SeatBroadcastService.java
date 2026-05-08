package com.ssafy.tickle.seat.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.tickle.seat.domain.SeatStatusChangedEvent;
import com.ssafy.tickle.seat.infrastructure.sse.SeatSseEmitterRepository;
import com.ssafy.tickle.seat.presentation.dto.SeatStatusMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;

/**
 * 좌석 상태 변경을 SSE로 브로드캐스트하는 서비스입니다.
 *
 * <p>성능과 호환성을 위해 Jackson ObjectMapper를 사용하여 JSON 문자열로 직접 변환 후 전송합니다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SeatBroadcastService {

    private final SeatSseEmitterRepository sseEmitterRepository;
    private final ObjectMapper objectMapper;

    /**
     * 좌석 상태 변경을 구독자 전체에게 SSE로 Push합니다.
     *
     * <p>트랜잭션 커밋 후 비동기로 실행하여 API 응답 지연을 방지한다.</p>
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSeatStatusChanged(SeatStatusChangedEvent event) {
        Long scheduleId = event.getScheduleId();
        List<SseEmitter> emitters = sseEmitterRepository.findByScheduleId(scheduleId);
        
        if (emitters.isEmpty()) {
            return;
        }

        try {
            // 1. 전송 데이터 준비 (JSON 문자열로 수동 변환)
            SeatStatusMessage message = new SeatStatusMessage(event.getSessionSeatIds(), event.getNewStatus());
            String jsonMessage = objectMapper.writeValueAsString(message);
            
            log.info("[SSE] Push Start -> emitters={}, data={}", emitters.size(), jsonMessage);

            // 2. 모든 구독자에게 전송
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event()
                            .name("seat-update")
                            .data(jsonMessage));
                } catch (IOException e) {
                    log.warn("[SSE] Emitter 전송 실패 (제거): {}", e.getMessage());
                    sseEmitterRepository.remove(scheduleId, emitter);
                }
            }
        } catch (JsonProcessingException e) {
            log.error("[SSE] 데이터 직렬화 실패: {}", e.getMessage());
        }
    }
}
