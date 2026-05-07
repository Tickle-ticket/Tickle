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
        QueueStatusResponse initialStatus = queueStatusService.getStatusByQueueToken(queueToken);

        SseEmitter emitter = new SseEmitter(QueueConstants.SSE_TIMEOUT_MILLIS);

        // queueToken 기준으로 emitter를 보관해두고, 이후 scheduler가 같은 사용자에게 상태를 push.
        emitters.put(queueToken, emitter);
        emitter.onCompletion(() -> leaveAndRemove(queueToken, emitter));
        emitter.onTimeout(() -> leaveAndRemove(queueToken, emitter));
        emitter.onError(exception -> leaveAndRemove(queueToken, emitter));

        send(queueToken, emitter, initialStatus);
        return emitter;
    }

    /**
     * SSE 연결 사용자에게 현재 대기 상태를 주기적으로 push 합니다.
     */
    @Scheduled(fixedDelay = 1000)
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
            leaveAndRemove(queueToken, emitter);
        }
    }

    private void leaveAndRemove(String queueToken, SseEmitter emitter) {
        if (emitters.remove(queueToken) == null) {
            return;
        }

        // SSE 연결 종료를 사용자의 이탈 신호로 보고 대기열 상태도 함께 정리한다.
        queueStatusService.leave(queueToken);
        emitter.complete();
    }
}
