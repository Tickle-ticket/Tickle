package com.ssafy.tickle.queue.infrastructure.cache;

import com.ssafy.tickle.queue.domain.SessionOpenInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 대기열 진입 검증용 회차 메타데이터를 Redis에 저장하고 조회합니다.
 */
@Component
@RequiredArgsConstructor
public class SessionOpenInfoCache {

    private static final String SALES_OPEN_AT = "salesOpenAt";
    private static final String SALES_CLOSE_AT = "salesCloseAt";

    private final StringRedisTemplate stringRedisTemplate;

    /**
     * 회차 메타데이터를 Redis에 저장합니다.
     *
     * @param metadata 저장할 회차 메타데이터
     */
    public void save(SessionOpenInfo metadata) {
        stringRedisTemplate.opsForHash().putAll(
                key(metadata.sessionId()),
                Map.of(
                        SALES_OPEN_AT, metadata.salesOpenAt().toString(),
                        SALES_CLOSE_AT, metadata.salesCloseAt().toString()
                )
        );
    }

    /**
     * 여러 회차 메타데이터를 Redis에 저장합니다.
     *
     * @param metadataList 저장할 회차 메타데이터 목록
     */
    public void saveAll(List<SessionOpenInfo> metadataList) {
        for (SessionOpenInfo metadata : metadataList) {
            save(metadata);
        }
    }

    /**
     * 회차 식별자로 메타데이터를 조회합니다.
     *
     * @param sessionId 회차 식별자
     * @return 회차 메타데이터
     */
    public Optional<SessionOpenInfo> findBySessionId(Long sessionId) {
        Object salesOpenAt = stringRedisTemplate.opsForHash().get(key(sessionId), SALES_OPEN_AT);
        Object salesCloseAt = stringRedisTemplate.opsForHash().get(key(sessionId), SALES_CLOSE_AT);

        if (salesOpenAt == null || salesCloseAt == null) {
            return Optional.empty();
        }

        return Optional.of(new SessionOpenInfo(
                sessionId,
                Instant.parse(salesOpenAt.toString()),
                Instant.parse(salesCloseAt.toString())
        ));
    }

    private String key(Long sessionId) {
        return "queue:session:" + sessionId;
    }
}
