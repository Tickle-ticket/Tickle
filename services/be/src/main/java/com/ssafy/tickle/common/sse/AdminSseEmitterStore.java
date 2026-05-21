package com.ssafy.tickle.common.sse;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

/**
 * 관리자 대시보드 SSE Emitter를 topic 단위로 관리하는 저장소입니다.
 *
 * <p>topic 예시: {@code "users.stats"}, {@code "bot.stats"}, {@code "queue.dashboard.1"}</p>
 */
@Slf4j
@Component
public class AdminSseEmitterStore {

    /** SSE 연결 타임아웃: 5분 */
    public static final long EMITTER_TIMEOUT_MS = 5 * 60 * 1000L;

    // ── 고정 topic 상수 ──────────────────────────────────────────────
    public static final String TOPIC_USER_STATS          = "users.stats";
    public static final String TOPIC_BOT_STATS           = "bot.stats";
    public static final String TOPIC_BLACKLIST_LIST      = "blacklist.list";
    public static final String TOPIC_BLACKLIST_DASHBOARD = "blacklist.dashboard";
    public static final String TOPIC_QUEUE_TOP           = "queue.top";
    public static final String TOPIC_QUEUE_DASHBOARD_PREFIX = "queue.dashboard.";
    // ─────────────────────────────────────────────────────────────────

    private final ConcurrentHashMap<String, CopyOnWriteArrayList<SseEmitter>> emitters =
            new ConcurrentHashMap<>();

    /**
     * topic에 SSE Emitter를 등록합니다.
     *
     * <p>타임아웃/완료/오류 발생 시 자동으로 제거됩니다.</p>
     *
     * @param topic   구독 토픽
     * @param emitter 등록할 SseEmitter
     */
    public void add(String topic, SseEmitter emitter) {
        emitters.computeIfAbsent(topic, k -> new CopyOnWriteArrayList<>()).add(emitter);
        log.debug("[Admin SSE] 등록: topic={}", topic);

        emitter.onTimeout(() -> {
            log.debug("[Admin SSE] 타임아웃: topic={}", topic);
            remove(topic, emitter);
        });
        emitter.onCompletion(() -> {
            log.debug("[Admin SSE] 완료: topic={}", topic);
            remove(topic, emitter);
        });
        emitter.onError(e -> {
            log.debug("[Admin SSE] 오류: topic={}", topic);
            remove(topic, emitter);
        });
    }

    /**
     * topic에서 특정 SSE Emitter를 제거합니다.
     */
    public void remove(String topic, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> list = emitters.get(topic);
        if (list != null) {
            list.remove(emitter);
        }
    }

    /**
     * topic에 등록된 모든 Emitter에 데이터를 broadcast합니다.
     *
     * <p>전송 실패한 Emitter는 자동으로 제거됩니다.</p>
     *
     * @param topic     구독 토픽
     * @param eventName SSE event 이름
     * @param data      전송할 데이터 객체 (JSON 직렬화)
     */
    public void broadcast(String topic, String eventName, Object data) {
        CopyOnWriteArrayList<SseEmitter> list = emitters.get(topic);
        if (list == null || list.isEmpty()) {
            return;
        }

        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(data, MediaType.APPLICATION_JSON));
            } catch (Exception e) {
                log.debug("[Admin SSE] broadcast 전송 실패, 제거: topic={}", topic);
                dead.add(emitter);
            }
        }
        dead.forEach(e -> remove(topic, e));
    }

    /**
     * topic에 활성 구독자가 있는지 확인합니다.
     */
    public boolean hasSubscribers(String topic) {
        CopyOnWriteArrayList<SseEmitter> list = emitters.get(topic);
        return list != null && !list.isEmpty();
    }

    /**
     * 특정 prefix로 시작하는 모든 활성 topic을 반환합니다.
     *
     * <p>주로 이벤트별 대기열 대시보드 topic 조회에 사용됩니다.</p>
     */
    public Set<String> topicsStartingWith(String prefix) {
        return emitters.keySet().stream()
                .filter(k -> k.startsWith(prefix) && hasSubscribers(k))
                .collect(Collectors.toSet());
    }
}
