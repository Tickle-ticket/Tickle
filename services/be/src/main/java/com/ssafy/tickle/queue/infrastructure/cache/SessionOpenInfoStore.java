package com.ssafy.tickle.queue.infrastructure.cache;

import com.ssafy.tickle.queue.infrastructure.cache.mapper.SessionOpenInfoHashMapper;
import com.ssafy.tickle.queue.infrastructure.cache.model.SessionOpenInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * 대기열 진입 검증용 회차 예매 오픈 정보를 Redis에 저장하고 조회합니다.
 */
@Component
@RequiredArgsConstructor
public class SessionOpenInfoStore {

    private final StringRedisTemplate stringRedisTemplate;
    private final SessionOpenInfoHashMapper sessionOpenInfoHashMapper;

    /**
     * 회차 예매 오픈 정보를 Redis에 저장합니다.
     *
     * @param info 저장할 회차 예매 오픈 정보
     */
    public void save(SessionOpenInfo info) {
        stringRedisTemplate.opsForHash().putAll(key(info.sessionId()),
                sessionOpenInfoHashMapper.toHash(info));
    }

    /**
     * 여러 회차 예매 오픈 정보를 Redis에 저장합니다.
     *
     * @param infoList 저장할 회차 오픈 정보 목록
     */
    public void saveAll(List<SessionOpenInfo> infoList) {
        for (SessionOpenInfo info : infoList) {
            save(info);
        }
    }

    /**
     * 회차 식별자로 예매 오픈 정보를 조회합니다.
     *
     * @param sessionId 회차 식별자
     * @return 회차 예매 오픈 정보
     */
    public Optional<SessionOpenInfo> findBySessionId(Long sessionId) {
        return sessionOpenInfoHashMapper.fromHash(
                sessionId,
                stringRedisTemplate.opsForHash().entries(key(sessionId))
        );
    }

    private String key(Long sessionId) {
        return "queue:session:" + sessionId;
    }
}
