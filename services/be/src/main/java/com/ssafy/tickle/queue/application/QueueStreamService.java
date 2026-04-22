package com.ssafy.tickle.queue.application;

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
public class QueueStreamService {

    private static final long SSE_TIMEOUT_MILLIS = 30L * 60L * 1000L;

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

        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MILLIS);
        emitters.put(queueToken, emitter);
        emitter.onCompletion(() -> emitters.remove(queueToken));
        emitter.onTimeout(() -> emitters.remove(queueToken));
        emitter.onError(exception -> emitters.remove(queueToken));

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
            } catch (RuntimeException exception) {
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
            emitter.complete();
        }
    }

}
