package com.ssafy.tickle.seat.infrastructure.sse;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 회차별 SSE Emitter를 관리하는 저장소입니다.
 *
 * <p>scheduleId를 키로 하여 연결된 {@link SseEmitter} 목록을 보관합니다.
 * 타임아웃/완료/오류 시 자동으로 emitter를 제거합니다.</p>
 */
@Slf4j
@Component
public class SeatSseEmitterRepository {

    private static final long EMITTER_TIMEOUT_MS = 30 * 60 * 1000L;

    private final ConcurrentHashMap<Long, CopyOnWriteArrayList<SseEmitter>> emitters =
            new ConcurrentHashMap<>();

    /**
     * 특정 회차에 SSE Emitter를 등록합니다.
     *
     * <p>타임아웃/완료/오류 발생 시 emitter가 자동으로 제거됩니다.</p>
     *
     * @param scheduleId 회차 식별자
     * @param emitter    등록할 SSE Emitter
     */
    public void add(Long scheduleId, SseEmitter emitter) {
        emitters.computeIfAbsent(scheduleId, id -> new CopyOnWriteArrayList<>()).add(emitter);
        log.debug("[SSE] Emitter 추가: scheduleId={}", scheduleId);

        emitter.onTimeout(() -> {
            log.debug("[SSE] Emitter 타임아웃: scheduleId={}", scheduleId);
            remove(scheduleId, emitter);
        });
        emitter.onCompletion(() -> {
            log.debug("[SSE] Emitter 완료: scheduleId={}", scheduleId);
            remove(scheduleId, emitter);
        });
        emitter.onError(e -> {
            log.debug("[SSE] Emitter 오류: scheduleId={}", scheduleId);
            remove(scheduleId, emitter);
        });
    }

    /**
     * 특정 회차에서 SSE Emitter를 제거합니다.
     *
     * @param scheduleId 회차 식별자
     * @param emitter    제거할 SSE Emitter
     */
    public void remove(Long scheduleId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> list = emitters.get(scheduleId);
        if (list != null) {
            list.remove(emitter);
            log.debug("[SSE] Emitter 제거: scheduleId={}", scheduleId);
        }
    }

    /**
     * 특정 회차에 연결된 모든 SSE Emitter를 반환합니다.
     *
     * @param scheduleId 회차 식별자
     * @return SSE Emitter 목록 (없으면 빈 리스트)
     */
    public List<SseEmitter> findByScheduleId(Long scheduleId) {
        CopyOnWriteArrayList<SseEmitter> list = emitters.get(scheduleId);
        if (list == null) {
            return List.of();
        }
        return List.copyOf(list);
    }
}
