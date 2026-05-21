package com.ssafy.tickle.blacklist.application;

import com.ssafy.tickle.common.sse.AdminSseEmitterStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 봇 탐지 현황 및 블랙리스트 데이터를 SSE 구독자에게 주기적으로 push하는 스케줄러입니다.
 *
 * <ul>
 *   <li>{@code bot.stats} — 5초마다 봇 탐지 현황 통계 broadcast</li>
 *   <li>{@code blacklist.list} — 30초마다 블랙리스트 1페이지 broadcast</li>
 *   <li>{@code blacklist.dashboard} — 10초마다 블랙리스트/봇 탐지 대시보드 broadcast</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBlacklistBroadcastScheduler {

    private final AdminSseEmitterStore store;
    private final BotDetectionService botDetectionService;
    private final BlacklistService blacklistService;
    private final AdminBlacklistDashboardService adminBlacklistDashboardService;

    @Scheduled(fixedDelay = 5_000L)
    public void broadcastBotStats() {
        if (!store.hasSubscribers(AdminSseEmitterStore.TOPIC_BOT_STATS)) {
            return;
        }
        try {
            store.broadcast(
                    AdminSseEmitterStore.TOPIC_BOT_STATS,
                    "bot.stats",
                    botDetectionService.getStats()
            );
        } catch (Exception e) {
            log.error("[Admin SSE] 봇 탐지 통계 broadcast 오류: {}", e.getMessage());
        }
    }

    @Scheduled(fixedDelay = 30_000L)
    public void broadcastBlacklistPage() {
        if (!store.hasSubscribers(AdminSseEmitterStore.TOPIC_BLACKLIST_LIST)) {
            return;
        }
        try {
            store.broadcast(
                    AdminSseEmitterStore.TOPIC_BLACKLIST_LIST,
                    "blacklist.list",
                    blacklistService.getBlacklist(0, 20)
            );
        } catch (Exception e) {
            log.error("[Admin SSE] 블랙리스트 목록 broadcast 오류: {}", e.getMessage());
        }
    }

    @Scheduled(fixedDelay = 10_000L)
    public void broadcastBlacklistDashboard() {
        if (!store.hasSubscribers(AdminSseEmitterStore.TOPIC_BLACKLIST_DASHBOARD)) {
            return;
        }
        try {
            store.broadcast(
                    AdminSseEmitterStore.TOPIC_BLACKLIST_DASHBOARD,
                    "blacklist.dashboard",
                    adminBlacklistDashboardService.getDashboard()
            );
        } catch (Exception e) {
            log.error("[Admin SSE] 블랙리스트 대시보드 broadcast 오류: {}", e.getMessage());
        }
    }
}
