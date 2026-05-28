package com.ssafy.tickle.queue.infrastructure.cache.store;

import com.ssafy.tickle.queue.config.QueueConstants;
import com.ssafy.tickle.queue.infrastructure.cache.mapper.EventOpenInfoHashMapper;
import com.ssafy.tickle.queue.infrastructure.cache.model.EventOpenInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * 대기열 진입 검증용 공연 예매 오픈 정보를 Redis에 저장하고 조회합니다.
 */
@Component
@RequiredArgsConstructor
public class EventOpenInfoStore {

    private final StringRedisTemplate stringRedisTemplate;
    private final EventOpenInfoHashMapper eventOpenInfoHashMapper;
    private final ConcurrentHashMap<Long, EventOpenInfo> localCache = new ConcurrentHashMap<>();

    /**
     * 공연 예매 오픈 정보를 Redis에 저장합니다.
     *
     * @param info 저장할 공연 예매 오픈 정보
     */
    public void save(EventOpenInfo info) {
        String key = key(info.eventId());
        Instant now = Instant.now();
        if (!info.salesEndAt().isAfter(now)) {
            localCache.remove(info.eventId());
            return;
        }

        localCache.put(info.eventId(), info);
        stringRedisTemplate.opsForHash().putAll(key,
                eventOpenInfoHashMapper.toHash(info));
        stringRedisTemplate.expire(key, Duration.between(now, info.salesEndAt()));
    }

    /**
     * 여러 공연 예매 오픈 정보를 Redis에 저장합니다.
     *
     * @param infoList 저장할 공연 오픈 정보 목록
     */
    public void saveAll(List<EventOpenInfo> infoList) {
        Instant now = Instant.now();
        Set<Long> activeEventIds = infoList.stream()
                .filter(info -> info.salesEndAt().isAfter(now))
                .map(EventOpenInfo::eventId)
                .collect(Collectors.toSet());

        localCache.keySet().removeIf(eventId -> !activeEventIds.contains(eventId));

        for (EventOpenInfo info : infoList) {
            save(info);
        }
    }

    /**
     * 공연 식별자로 예매 오픈 정보를 조회합니다.
     *
     * @param eventId 공연 식별자
     * @return 공연 예매 오픈 정보
     */
    public Optional<EventOpenInfo> findByEventId(Long eventId) {
        EventOpenInfo cached = localCache.get(eventId);
        if (cached != null) {
            return Optional.of(cached);
        }

        Optional<EventOpenInfo> redisInfo = eventOpenInfoHashMapper.fromHash(
                eventId,
                stringRedisTemplate.opsForHash().entries(key(eventId))
        );
        redisInfo.ifPresent(info -> localCache.put(eventId, info));
        return redisInfo;
    }

    private String key(Long eventId) {
        return QueueConstants.EVENT_KEY_PREFIX + eventId;
    }
}
