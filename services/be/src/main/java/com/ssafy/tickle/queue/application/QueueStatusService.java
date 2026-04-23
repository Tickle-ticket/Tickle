package com.ssafy.tickle.queue.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.queue.domain.QueueRequestStatus;
import com.ssafy.tickle.queue.infrastructure.cache.model.QueueStatusSnapshot;
import com.ssafy.tickle.queue.infrastructure.cache.model.QueueEnterRequestReference;
import com.ssafy.tickle.queue.infrastructure.cache.QueueEnterRequestStore;
import com.ssafy.tickle.queue.infrastructure.cache.QueueStatusStore;
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

    private static final Duration QUEUE_TOKEN_TTL = Duration.ofHours(3);
    private static final Duration ADMIT_TOKEN_TTL = Duration.ofMinutes(10);
    private static final String QUEUE_TOKEN_REQUEST_KEY_PREFIX = "queue:token:request:";

    private static final Duration ETA_WINDOW = Duration.ofMinutes(3);
    private static final long DEFAULT_ADMISSION_RATE_PER_MINUTE = 30L;

    private final QueueEnterRequestStore queueEnterRequestStore;
    private final QueueStatusStore queueStatusStore;
    private final StringRedisTemplate stringRedisTemplate;

    /**
     * requestId를 기반으로 최초 queueToken을 발급합니다.
     *
     * @param requestId 비동기 등록 추적용 요청 식별자
     * @return queueToken과 현재 상태
     */
    public QueueTokenResponse getQueueToken(String requestId) {
        QueueEnterRequestReference reference = queueEnterRequestStore.findReferenceByRequestId(requestId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "없는 대기열 진입 요청입니다."));

        // requestId 기준으로 queueToken을 고정해두면 새로고침/재호출에도 같은 토큰을 재사용할 수 있다.
        String queueToken = issueQueueToken(requestId);
        queueStatusStore.registerWaitingIfAbsent(
                queueToken,
                requestId,
                reference.userId(),
                reference.sessionId(),
                Instant.now()
        );

        return QueueTokenResponse.waiting(queueToken);
    }

    public QueueTokenResponse getQueueToken(Long sessionId, String requestId) {
        QueueEnterRequestReference reference = queueEnterRequestStore.findReferenceByRequestId(requestId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "없는 대기열 진입 요청입니다."));
        if (!reference.sessionId().equals(sessionId)) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "요청한 회차와 대기열 진입 요청의 회차가 일치하지 않습니다.");
        }
        return getQueueToken(requestId);
    }

    /**
     * queueToken 기준 현재 대기 상태를 조회합니다.
     *
     * @param queueToken 대기열 토큰
     * @return 현재 대기 상태
     */
    public QueueStatusResponse getStatusByQueueToken(String queueToken) {
        QueueStatusSnapshot snapshot = queueStatusStore.findSnapshot(queueToken)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "없는 대기열 토큰입니다."));

        if (snapshot.status() == QueueRequestStatus.ADMITTED) {
            return QueueStatusResponse.admitted(queueToken, snapshot.admitToken());
        }

        if (snapshot.status() != QueueRequestStatus.WAITING) {
            return new QueueStatusResponse(queueToken, snapshot.status(), null, null, null, null, null);
        }

        // 순번과 ETA는 조회 시점의 redis 상태를 읽어 계산.
        Long rank = queueStatusStore.findRank(snapshot.sessionId(), queueToken);
        long waitingCount = queueStatusStore.countWaiting(snapshot.sessionId());
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

    public QueueStatusResponse getStatusByQueueToken(Long sessionId, String queueToken) {
        QueueStatusSnapshot snapshot = queueStatusStore.findSnapshot(queueToken)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "없는 대기열 토큰입니다."));
        if (!snapshot.sessionId().equals(sessionId)) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "요청한 회차와 대기열 토큰의 회차가 일치하지 않습니다.");
        }
        return getStatusByQueueToken(queueToken);
    }

    public Long slotLimit() {
        return 100L;
    }

    public Duration queueTokenTtl() {
        return QUEUE_TOKEN_TTL;
    }

    public Duration admitTokenTtl() {
        return ADMIT_TOKEN_TTL;
    }

    /**
     * 대기열 사용자의 명시적 이탈을 처리합니다.
     */
    public void leave(String queueToken) {
        QueueStatusSnapshot snapshot = queueStatusStore.findSnapshot(queueToken)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "없는 대기열 토큰입니다."));

        if (snapshot.status() != QueueRequestStatus.WAITING && snapshot.status() != QueueRequestStatus.ADMITTED) {
            return;
        }

        queueStatusStore.leave(snapshot);
        deleteRelatedTokens(snapshot);
    }

    public void leave(Long sessionId, String queueToken) {
        QueueStatusSnapshot snapshot = queueStatusStore.findSnapshot(queueToken)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "없는 대기열 토큰입니다."));
        if (!snapshot.sessionId().equals(sessionId)) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "요청한 회차와 대기열 토큰의 회차가 일치하지 않습니다.");
        }
        leave(queueToken);
    }

    public void expire(String queueToken) {
        QueueStatusSnapshot snapshot = queueStatusStore.findSnapshot(queueToken)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "없는 대기열 토큰입니다."));

        if (snapshot.status() != QueueRequestStatus.WAITING && snapshot.status() != QueueRequestStatus.ADMITTED) {
            return;
        }

        queueStatusStore.expire(snapshot);
        deleteRelatedTokens(snapshot);
    }

    private String issueQueueToken(String requestId) {
        String requestKey = QUEUE_TOKEN_REQUEST_KEY_PREFIX + requestId;

        // 같은 requestId에 대해 최초 1회만 queueToken을 발급하고, 이후에는 기존 토큰을 재사용한다.
        String existingQueueToken = stringRedisTemplate.opsForValue().get(requestKey);
        if (existingQueueToken != null) {
            return existingQueueToken;
        }

        String queueToken = UUID.randomUUID().toString();

        // 같은 requestId에 대해 queueToken을 한 번만 고정 저장한다.
        Boolean saved = stringRedisTemplate.opsForValue().setIfAbsent(requestKey, queueToken, QUEUE_TOKEN_TTL);
        if (Boolean.TRUE.equals(saved)) {
            return queueToken;
        }

        // 동시에 여러 요청이 들어오면 이미 다른 스레드가 저장한 queueToken을 다시 읽어 반환.
        return stringRedisTemplate.opsForValue().get(requestKey);
    }

    private void deleteRelatedTokens(QueueStatusSnapshot snapshot) {
        stringRedisTemplate.delete(QUEUE_TOKEN_REQUEST_KEY_PREFIX + snapshot.requestId());
        queueEnterRequestStore.delete(snapshot.userId(), snapshot.sessionId(), snapshot.requestId());
    }

    private long estimateWaitSeconds(Long sessionId, Long rank) {
        if (rank == null || rank <= 1L) {
            return 0L;
        }

        Instant now = Instant.now();
        long recentAdmissionCount = queueStatusStore.countRecentAdmissions(sessionId, now.minus(ETA_WINDOW), now);
        // 아직 admission 기록이 없으면 fallback 처리량으로만 ETA를 추정한다.
        long admissionRatePerMinute = recentAdmissionCount == 0L
                ? DEFAULT_ADMISSION_RATE_PER_MINUTE
                : Math.max(1L, recentAdmissionCount / ETA_WINDOW.toMinutes());

        long aheadCount = rank - 1L;
        return Math.max(0L, (aheadCount * 60L) / admissionRatePerMinute);
    }
}
