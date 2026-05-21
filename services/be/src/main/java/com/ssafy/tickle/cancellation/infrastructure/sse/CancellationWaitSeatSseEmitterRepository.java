package com.ssafy.tickle.cancellation.infrastructure.sse;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 회차별 예매 대기 좌석 SSE Emitter를 관리하는 저장소입니다.
 */
@Slf4j
@Component
public class CancellationWaitSeatSseEmitterRepository {

    private static final long EMITTER_TIMEOUT_MS = 30 * 60 * 1000L;

    private final ConcurrentHashMap<Long, CopyOnWriteArrayList<SseEmitter>> emitters =
            new ConcurrentHashMap<>();

    /**
     * 특정 회차에 예매 대기 SSE Emitter를 등록합니다.
     *
     * @param scheduleId 회차 식별자
     * @param emitter 등록할 SSE Emitter
     */
    public void add(Long scheduleId, SseEmitter emitter) {
        emitters.computeIfAbsent(scheduleId, id -> new CopyOnWriteArrayList<>()).add(emitter);
        log.debug("[CancellationWaitSSE] Emitter 추가: scheduleId={}", scheduleId);

        emitter.onTimeout(() -> {
            log.debug("[CancellationWaitSSE] Emitter 타임아웃: scheduleId={}", scheduleId);
            remove(scheduleId, emitter);
        });
        emitter.onCompletion(() -> {
            log.debug("[CancellationWaitSSE] Emitter 완료: scheduleId={}", scheduleId);
            remove(scheduleId, emitter);
        });
        emitter.onError(e -> {
            log.debug("[CancellationWaitSSE] Emitter 오류: scheduleId={}", scheduleId);
            remove(scheduleId, emitter);
        });
    }

    /**
     * 특정 회차에서 SSE Emitter를 제거합니다.
     *
     * @param scheduleId 회차 식별자
     * @param emitter 제거할 SSE Emitter
     */
    public void remove(Long scheduleId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> emittersBySchedule = emitters.get(scheduleId);
        if (emittersBySchedule != null) {
            emittersBySchedule.remove(emitter);
            log.debug("[CancellationWaitSSE] Emitter 제거: scheduleId={}", scheduleId);
        }
    }

    /**
     * 특정 회차에 연결된 예매 대기 SSE 구독 목록을 반환합니다.
     *
     * @param scheduleId 회차 식별자
     * @return SSE Emitter 목록
     */
    public List<SseEmitter> findByScheduleId(Long scheduleId) {
        CopyOnWriteArrayList<SseEmitter> emittersBySchedule = emitters.get(scheduleId);
        if (emittersBySchedule == null) {
            return List.of();
        }
        return List.copyOf(emittersBySchedule);
    }

    /**
     * SSE 연결 타임아웃을 반환합니다.
     *
     * @return SSE 연결 타임아웃 밀리초
     */
    public static long timeoutMillis() {
        return EMITTER_TIMEOUT_MS;
    }
}
