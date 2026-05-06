package com.ssafy.tickle.queue.application.scheduler;

import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.queue.infrastructure.cache.model.EventOpenInfo;
import com.ssafy.tickle.queue.infrastructure.cache.store.EventOpenInfoStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * 대기열 진입 검증용 공연 메타데이터를 Redis에 동기화합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EventOpenInfoScheduler {

    private final EventRepository eventRepository;
    private final EventOpenInfoStore eventOpenInfoStore;

    /**
     * 1분마다 오픈 중이거나 2시간 내 오픈 예정인 공연 메타데이터를 Redis에 동기화합니다.
     */
    @Scheduled(fixedRate = 60_000L)
    public void sync() {
        Instant now = Instant.now();
        Instant preloadUntil = now.plus(2, ChronoUnit.HOURS); // 2시간

        // queue enter hot path에서 DB를 치지 않도록, 오픈 중/임박 공연만 미리 Redis에 올려둔다.
        List<EventOpenInfo> eventOpenInfos = eventRepository
                .findBySalesEndAtAfterAndSalesStartAtBefore(now, preloadUntil)
                .stream()
                .map(EventOpenInfoScheduler::toEventOpenInfo)
                .toList();

        eventOpenInfoStore.saveAll(eventOpenInfos);
    }

    private static EventOpenInfo toEventOpenInfo(Event event) {
        return new EventOpenInfo(event.getId(), event.getSalesStartAt(), event.getSalesEndAt());
    }
}
