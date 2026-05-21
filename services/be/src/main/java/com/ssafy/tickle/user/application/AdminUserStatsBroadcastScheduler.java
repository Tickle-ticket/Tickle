package com.ssafy.tickle.user.application;

import com.ssafy.tickle.common.sse.AdminSseEmitterStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 실시간 사용자 접속 통계를 SSE 구독자에게 주기적으로 push하는 스케줄러입니다.
 *
 * <p>10초마다 {@code users.stats} topic 구독자에게 데이터를 broadcast합니다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminUserStatsBroadcastScheduler {

    private final AdminSseEmitterStore store;
    private final ActiveUserStatsService activeUserStatsService;

    @Scheduled(fixedDelay = 10_000L)
    public void broadcast() {
        if (!store.hasSubscribers(AdminSseEmitterStore.TOPIC_USER_STATS)) {
            return;
        }
        try {
            store.broadcast(
                    AdminSseEmitterStore.TOPIC_USER_STATS,
                    "users.stats",
                    activeUserStatsService.getStats()
            );
        } catch (Exception e) {
            log.error("[Admin SSE] 사용자 통계 broadcast 오류: {}", e.getMessage());
        }
    }
}
