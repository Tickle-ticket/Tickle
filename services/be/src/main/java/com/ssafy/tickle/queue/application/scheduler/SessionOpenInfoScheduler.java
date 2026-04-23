package com.ssafy.tickle.queue.application.scheduler;

import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.queue.infrastructure.cache.model.SessionOpenInfo;
import com.ssafy.tickle.queue.infrastructure.cache.store.SessionOpenInfoStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * 대기열 진입 검증용 회차 메타데이터를 Redis에 동기화합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SessionOpenInfoScheduler {

    private final EventSessionRepository eventSessionRepository;
    private final SessionOpenInfoStore sessionOpenInfoStore;

    /**
     * 1분마다 오픈 중이거나 2시간 내 오픈 예정인 회차 메타데이터를 Redis에 동기화합니다.
     */
    @Scheduled(fixedRate = 60_000L)
    public void sync() {
        Instant now = Instant.now();
        Instant preloadUntil = now.plus(2, ChronoUnit.HOURS); // 2시간

        // queue enter hot path에서 DB를 치지 않도록, 오픈 중/임박 회차만 미리 Redis에 올려둔다.
        List<SessionOpenInfo> sessionOpenInfos = eventSessionRepository
                .findBySalesCloseAtAfterAndSalesOpenAtBefore(now, preloadUntil)
                .stream()
                .map(SessionOpenInfo::from)
                .toList();

        sessionOpenInfoStore.saveAll(sessionOpenInfos);
    }
}
