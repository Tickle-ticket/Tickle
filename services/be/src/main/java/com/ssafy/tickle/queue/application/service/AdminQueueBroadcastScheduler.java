package com.ssafy.tickle.queue.application.service;

import com.ssafy.tickle.common.sse.AdminSseEmitterStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * 대기열 현황 및 랭킹 데이터를 SSE 구독자에게 실시간으로 push하는 스케줄러입니다.
 * 
 * <p>대기열 스파이크를 빠르게 감지하기 위해 2초 주기로 실행됩니다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminQueueBroadcastScheduler {

    private final AdminSseEmitterStore store;
    private final AdminQueueDashboardService adminQueueDashboardService;

    /**
     * 2초마다 대기열 상위 랭킹을 broadcast합니다.
     */
    @Scheduled(fixedDelay = 2_000L)
    public void broadcastTopWaitingEvents() {
        if (!store.hasSubscribers(AdminSseEmitterStore.TOPIC_QUEUE_TOP)) {
            return;
        }
        try {
            store.broadcast(
                    AdminSseEmitterStore.TOPIC_QUEUE_TOP,
                    "queue.top",
                    adminQueueDashboardService.getTopWaitingEvents()
            );
        } catch (Exception e) {
            log.error("[Admin SSE] 대기열 랭킹 broadcast 오류: {}", e.getMessage());
        }
    }

    /**
     * 2초마다 현재 구독 중인 모든 이벤트별 대기열 대시보드를 broadcast합니다.
     */
    @Scheduled(fixedDelay = 2_000L)
    public void broadcastEventDashboards() {
        Set<String> activeTopics = store.topicsStartingWith(AdminSseEmitterStore.TOPIC_QUEUE_DASHBOARD_PREFIX);
        if (activeTopics.isEmpty()) {
            return;
        }

        for (String topic : activeTopics) {
            try {
                // "queue.dashboard.123" 에서 eventId인 123 추출
                Long eventId = Long.parseLong(topic.replace(AdminSseEmitterStore.TOPIC_QUEUE_DASHBOARD_PREFIX, ""));
                
                store.broadcast(
                        topic,
                        "queue.dashboard",
                        adminQueueDashboardService.getEventDashboard(eventId)
                );
            } catch (Exception e) {
                log.error("[Admin SSE] 대기열 대시보드 broadcast 오류 (topic={}): {}", topic, e.getMessage());
            }
        }
    }
}
