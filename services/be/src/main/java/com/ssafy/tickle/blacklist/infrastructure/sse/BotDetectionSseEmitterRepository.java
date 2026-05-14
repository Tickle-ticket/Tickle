package com.ssafy.tickle.blacklist.infrastructure.sse;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

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
        CopyOnWriteArrayList<SseEmitter> userEmitters =
                emitters.computeIfAbsent(userId, id -> new CopyOnWriteArrayList<>());
        userEmitters.add(emitter);

        emitter.onTimeout(() -> {
            log.info("[BotDetectionSSE] timeout: userId={}", userId);
            remove(userId, emitter);
        });
        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onError(e -> {
            log.warn(
                    "[BotDetectionSSE] error: userId={}, type={}, message={}",
                    userId,
                    e.getClass().getSimpleName(),
                    e.getMessage()
            );
            remove(userId, emitter);
        });

        log.info("[BotDetectionSSE] subscribe: userId={}, count={}", userId, userEmitters.size());
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
        boolean removed = false;
        int remainingCount = 0;
        if (userEmitters != null) {
            removed = userEmitters.remove(emitter);
            remainingCount = userEmitters.size();
            if (userEmitters.isEmpty()) {
                emitters.remove(userId, userEmitters);
            }
        }
        log.debug("[BotDetectionSSE] remove: userId={}, removed={}, remaining={}", userId, removed, remainingCount);
    }
}
