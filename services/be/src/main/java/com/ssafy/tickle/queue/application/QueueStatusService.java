package com.ssafy.tickle.queue.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.queue.infrastructure.cache.QueueEnterRequestCache;
import com.ssafy.tickle.queue.presentation.dto.QueueStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

/**
 * 대기열 상태 조회와 queueToken 발급을 담당합니다.
 */
@Service
@RequiredArgsConstructor
public class QueueStatusService {

    private static final Duration QUEUE_TOKEN_TTL = Duration.ofMinutes(30);
    private static final String QUEUE_TOKEN_REQUEST_KEY_PREFIX = "queue:token:request:";
    private static final String QUEUE_TOKEN_KEY_PREFIX = "queue:token:";

    private final QueueEnterRequestCache queueEnterRequestCache;
    private final StringRedisTemplate stringRedisTemplate;

    /**
     * requestId를 기반으로 최초 queueToken을 발급합니다.
     *
     * @param requestId 비동기 등록 추적용 요청 식별자
     * @return queueToken과 현재 상태
     */
    public QueueStatusResponse getQueueToken(String requestId) {
        if (!queueEnterRequestCache.existsRequestId(requestId)) {
            throw new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "없는 대기열 진입 요청입니다.");
        }

        String queueToken = issueQueueToken(requestId);
        return QueueStatusResponse.waiting(queueToken);
    }

    private String issueQueueToken(String requestId) {
        String requestKey = QUEUE_TOKEN_REQUEST_KEY_PREFIX + requestId;

        // 같은 requestId에 대해 최초 1회만 queueToken을 발급하고, 이후에는 기존 토큰을 재사용한다.
        String existingQueueToken = stringRedisTemplate.opsForValue().get(requestKey);
        if (existingQueueToken != null) {
            return existingQueueToken;
        }

        String queueToken = UUID.randomUUID().toString();

        // requestId와 queueToken을 양방향으로 저장.
        Boolean saved = stringRedisTemplate.opsForValue().setIfAbsent(requestKey, queueToken, QUEUE_TOKEN_TTL);
        if (Boolean.TRUE.equals(saved)) {
            stringRedisTemplate.opsForValue().set(QUEUE_TOKEN_KEY_PREFIX + queueToken, requestId, QUEUE_TOKEN_TTL);
            return queueToken;
        }

        return stringRedisTemplate.opsForValue().get(requestKey);
    }
}
