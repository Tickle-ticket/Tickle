package com.ssafy.tickle.queue.infrastructure.cache.store;

import com.ssafy.tickle.queue.config.QueueConstants;
import com.ssafy.tickle.queue.infrastructure.cache.mapper.EventOpenInfoHashMapper;
import com.ssafy.tickle.queue.infrastructure.cache.model.EventOpenInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * 대기열 진입 검증용 공연 예매 오픈 정보를 Redis에 저장하고 조회합니다.
 */
@Component
@RequiredArgsConstructor
public class EventOpenInfoStore {

    private final StringRedisTemplate stringRedisTemplate;
    private final EventOpenInfoHashMapper eventOpenInfoHashMapper;

    /**
     * 공연 예매 오픈 정보를 Redis에 저장합니다.
     *
     * @param info 저장할 공연 예매 오픈 정보
     */
    public void save(EventOpenInfo info) {
        stringRedisTemplate.opsForHash().putAll(key(info.eventId()),
                eventOpenInfoHashMapper.toHash(info));
    }

    /**
     * 여러 공연 예매 오픈 정보를 Redis에 저장합니다.
     *
     * @param infoList 저장할 공연 오픈 정보 목록
     */
    public void saveAll(List<EventOpenInfo> infoList) {
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
        return eventOpenInfoHashMapper.fromHash(
                eventId,
                stringRedisTemplate.opsForHash().entries(key(eventId))
        );
    }

    private String key(Long eventId) {
        return QueueConstants.EVENT_KEY_PREFIX + eventId;
    }
}
