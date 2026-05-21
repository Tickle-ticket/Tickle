package com.ssafy.tickle.queue.application.service;

import com.ssafy.tickle.queue.config.QueueConstants;
import com.ssafy.tickle.queue.presentation.dto.QueueStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * queueToken 기준 SSE 연결과 주기적 상태 push를 담당합니다.
 */
@Service
@RequiredArgsConstructor
public class QueueSseHandler {

    private final QueueStatusService queueStatusService;

    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    /**
     * queueToken 기준 SSE 연결을 열고 현재 상태를 최초 1회 전송합니다.
     *
     * @param queueToken 대기열 토큰
     * @return SSE emitter
     */
    public SseEmitter connect(String queueToken) {
        // 1. 현재 상태를 즉시 조회
        QueueStatusResponse initialStatus = queueStatusService.getStatusByQueueToken(queueToken);

        SseEmitter emitter = new SseEmitter(QueueConstants.SSE_TIMEOUT_MILLIS);

        // 연결 끊김 시 맵에서 제거
        emitter.onCompletion(() -> emitters.remove(queueToken));
        emitter.onTimeout(() -> emitters.remove(queueToken));
        emitter.onError(exception -> emitters.remove(queueToken));

        // 2. 초기 데이터 전송 (헤더 플러시 및 레이스 컨디션 방지)
        // 아직 맵에 넣기 전이므로 스케줄러 쓰레드와 충돌하지 않음 (Thread-safety 보장)
        try {
            emitter.send(SseEmitter.event()
                    .name("connect")
                    .data("connected"));
            
            // 즉시 현재 상태 전송 (0.5초 지연 제거)
            send(queueToken, emitter, initialStatus);
        } catch (java.io.IOException | IllegalStateException e) {
            return emitter;
        }

        // 3. 모든 초기 전송이 성공한 후 맵에 등록하여 스케줄러 관리 시작
        emitters.put(queueToken, emitter);

        return emitter;
    }

    /**
     * SSE 연결 사용자에게 현재 대기 상태를 주기적으로 push 합니다.
     */
    @Scheduled(fixedDelay = QueueConstants.SCHEDULER_INTERVAL_MILLIS)
    public void pushStatus() {
        for (Map.Entry<String, SseEmitter> entry : emitters.entrySet()) {
            String queueToken = entry.getKey();
            SseEmitter emitter = entry.getValue();
            try {
                QueueStatusResponse response = queueStatusService.getStatusByQueueToken(queueToken);
                send(queueToken, emitter, response);
                if (response.status() == com.ssafy.tickle.queue.domain.QueueRequestStatus.LEFT
                        || response.status() == com.ssafy.tickle.queue.domain.QueueRequestStatus.EXPIRED) {
                    emitters.remove(queueToken);
                    emitter.complete();
                }
            } catch (RuntimeException exception) {
                // 상태 조회나 전송이 실패한 emitter는 즉시 제거.
                emitters.remove(queueToken);
                emitter.complete();
            }
        }
    }

    private void send(String queueToken, SseEmitter emitter, QueueStatusResponse response) {
        try {
            emitter.send(SseEmitter.event()
                    .name("queue-status")
                    .id(queueToken)
                    .data(response));
        } catch (IOException | IllegalStateException exception) {
            emitters.remove(queueToken);
        }
    }
}
