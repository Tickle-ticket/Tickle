package com.ssafy.tickle.blacklist.infrastructure.sse;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 봇 탐지 CAPTCHA 요청용 사용자별 SSE Emitter 저장소입니다.
 */
@Slf4j
@Component
public class BotDetectionSseEmitterRepository {

    private static final long EMITTER_TIMEOUT_MS = 30L * 60L * 1000L;

    private final ConcurrentHashMap<Long, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter add(Long userId) {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
        emitters.computeIfAbsent(userId, id -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onTimeout(() -> remove(userId, emitter));
        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onError(e -> remove(userId, emitter));

        log.debug("[BotDetectionSSE] Emitter 추가: userId={}", userId);
        return emitter;
    }

    public List<SseEmitter> findByUserId(Long userId) {
        CopyOnWriteArrayList<SseEmitter> userEmitters = emitters.get(userId);
        if (userEmitters == null) {
            return List.of();
        }
        return List.copyOf(userEmitters);
    }

    public void remove(Long userId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> userEmitters = emitters.get(userId);
        if (userEmitters != null) {
            userEmitters.remove(emitter);
            if (userEmitters.isEmpty()) {
                emitters.remove(userId, userEmitters);
            }
        }
        log.debug("[BotDetectionSSE] Emitter 제거: userId={}", userId);
    }
}
