package com.ssafy.tickle.queue.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.queue.application.dto.QueueStatusSnapshot;
import com.ssafy.tickle.queue.domain.cache.QueueEnterReference;
import com.ssafy.tickle.queue.domain.cache.QueueRequestStatus;
import com.ssafy.tickle.queue.infrastructure.cache.QueueEnterRequestCache;
import com.ssafy.tickle.queue.infrastructure.cache.QueueStatusCache;
import com.ssafy.tickle.queue.presentation.dto.QueueTokenResponse;
import com.ssafy.tickle.queue.presentation.dto.QueueStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * 대기열 상태 조회와 queueToken 발급을 담당합니다.
 */
@Service
@RequiredArgsConstructor
public class QueueStatusService {

    private static final Duration QUEUE_TOKEN_TTL = Duration.ofMinutes(30);
    private static final String QUEUE_TOKEN_REQUEST_KEY_PREFIX = "queue:token:request:";

    private static final Duration ETA_WINDOW = Duration.ofMinutes(3);
    private static final long DEFAULT_ADMISSION_RATE_PER_MINUTE = 30L;

    private final QueueEnterRequestCache queueEnterRequestCache;
    private final QueueStatusCache queueStatusCache;
    private final StringRedisTemplate stringRedisTemplate;

    /**
     * requestId를 기반으로 최초 queueToken을 발급합니다.
     *
     * @param requestId 비동기 등록 추적용 요청 식별자
     * @return queueToken과 현재 상태
     */
    public QueueTokenResponse getQueueToken(String requestId) {
        QueueEnterReference reference = queueEnterRequestCache.findReferenceByRequestId(requestId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "없는 대기열 진입 요청입니다."));

        String queueToken = issueQueueToken(requestId);
        queueStatusCache.registerWaitingIfAbsent(
                queueToken,
                requestId,
                reference.userId(),
                reference.sessionId(),
                Instant.now()
        );

        return QueueTokenResponse.waiting(queueToken);
    }

    /**
     * queueToken 기준 현재 대기 상태를 조회합니다.
     *
     * @param queueToken 대기열 토큰
     * @return 현재 대기 상태
     */
    public QueueStatusResponse getStatusByQueueToken(String queueToken) {
        QueueStatusSnapshot snapshot = queueStatusCache.findSnapshot(queueToken)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "없는 대기열 토큰입니다."));

        Long rank = queueStatusCache.findRank(snapshot.sessionId(), queueToken);
        long waitingCount = queueStatusCache.countWaiting(snapshot.sessionId());
        long estimatedWaitSeconds = estimateWaitSeconds(snapshot.sessionId(), rank);
        Instant estimatedEntryAt = Instant.now().plusSeconds(estimatedWaitSeconds);

        return QueueStatusResponse.waiting(
                queueToken,
                rank,
                waitingCount,
                estimatedWaitSeconds,
                estimatedEntryAt
        );
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
            return queueToken;
        }

        return stringRedisTemplate.opsForValue().get(requestKey);
    }

    private long estimateWaitSeconds(Long sessionId, Long rank) {
        if (rank == null || rank <= 1L) {
            return 0L;
        }

        Instant now = Instant.now();
        long recentAdmissionCount = queueStatusCache.countRecentAdmissions(sessionId, now.minus(ETA_WINDOW), now);
        long admissionRatePerMinute = recentAdmissionCount == 0L
                ? DEFAULT_ADMISSION_RATE_PER_MINUTE
                : Math.max(1L, recentAdmissionCount / ETA_WINDOW.toMinutes());

        long aheadCount = rank - 1L;
        return Math.max(0L, (aheadCount * 60L) / admissionRatePerMinute);
    }
}
