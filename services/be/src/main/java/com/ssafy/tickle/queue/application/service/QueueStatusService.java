package com.ssafy.tickle.queue.application.service;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.queue.config.QueueConstants;
import com.ssafy.tickle.queue.domain.QueueRequestStatus;
import com.ssafy.tickle.queue.domain.QueueScope;
import com.ssafy.tickle.queue.infrastructure.cache.model.QueueStatusSnapshot;
import com.ssafy.tickle.queue.infrastructure.cache.model.QueueEnterRequestReference;
import com.ssafy.tickle.queue.infrastructure.cache.store.QueueEnterRequestStore;
import com.ssafy.tickle.queue.infrastructure.cache.store.QueueStatusStore;
import com.ssafy.tickle.queue.presentation.dto.QueueTokenResponse;
import com.ssafy.tickle.queue.presentation.dto.QueueStatusResponse;
import com.ssafy.tickle.queue.presentation.dto.QueueStatsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

/**
 * 대기열 상태 조회와 queueToken 발급을 담당합니다.
 */
@Service
@RequiredArgsConstructor
public class QueueStatusService {

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
                reference.scope(),
                reference.sessionId(),
                Instant.now()
        );

        return QueueTokenResponse.waiting(queueToken);
    }

    public QueueTokenResponse getQueueToken(Long sessionId, String requestId) {
        return getQueueToken(QueueScope.BOOKING, sessionId, requestId);
    }

    public QueueTokenResponse getQueueToken(QueueScope scope, Long sessionId, String requestId) {
        QueueEnterRequestReference reference = queueEnterRequestStore.findReferenceByRequestId(requestId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "없는 대기열 진입 요청입니다."));
        if (!reference.sessionId().equals(sessionId) || reference.scope() != scope) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "요청한 대기열과 진입 요청 정보가 일치하지 않습니다.");
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
        Long rank = queueStatusStore.findRank(snapshot.scope(), snapshot.sessionId(), queueToken);
        long waitingCount = queueStatusStore.countWaiting(snapshot.scope(), snapshot.sessionId());
        long estimatedWaitSeconds = estimateWaitSeconds(snapshot.scope(), snapshot.sessionId(), rank);
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
        return getStatusByQueueToken(QueueScope.BOOKING, sessionId, queueToken);
    }

    public QueueStatusResponse getStatusByQueueToken(QueueScope scope, Long sessionId, String queueToken) {
        QueueStatusSnapshot snapshot = queueStatusStore.findSnapshot(queueToken)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "없는 대기열 토큰입니다."));
        if (!snapshot.sessionId().equals(sessionId) || snapshot.scope() != scope) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "요청한 대기열과 토큰 정보가 일치하지 않습니다.");
        }
        return getStatusByQueueToken(queueToken);
    }

    public Long slotLimit() {
        return QueueConstants.SLOT_LIMIT;
    }

    public java.time.Duration queueTokenTtl() {
        return QueueConstants.QUEUE_TOKEN_TTL;
    }

    public java.time.Duration admitTokenTtl() {
        return QueueConstants.ADMIT_TOKEN_TTL;
    }

    /**
     * 어드민용: 특정 회차의 대기열 현황 통계를 조회합니다.
     *
     * <p>대기 인원, 입장 허용 인원, 예상 평균 대기 시간을 Redis에서 실시간으로 조회합니다.</p>
     *
     * @param sessionId 회차 식별자
     * @return 대기열 현황 통계
     */
    public QueueStatsResponse getQueueStats(Long sessionId) {
        long totalWaiting = queueStatusStore.countWaiting(QueueScope.BOOKING, sessionId);
        long processingCount = queueStatusStore.countAdmitted(QueueScope.BOOKING, sessionId);

        // 대기열 중간(절반 순번)을 기준으로 대표 평균 대기 시간 산출
        long midRank = totalWaiting == 0 ? 0L : Math.max(1L, totalWaiting / 2);
        long averageWaitSeconds = totalWaiting == 0
                ? 0L
                : estimateWaitSeconds(QueueScope.BOOKING, sessionId, midRank);

        return new QueueStatsResponse(sessionId, totalWaiting, processingCount, averageWaitSeconds, QueueConstants.SLOT_LIMIT);
    }

    /**
     * admitToken이 특정 대기열 입장 권한을 나타내는지 검증합니다.
     *
     * @param scope 대기열 목적
     * @param sessionId 회차 식별자
     * @param userId 사용자 식별자
     * @param admitToken 입장 허용 토큰
     * @return 검증된 대기열 스냅샷
     */
    public QueueStatusSnapshot validateAdmitToken(
            QueueScope scope,
            Long sessionId,
            Long userId,
            String admitToken
    ) {
        String queueToken = queueStatusStore.findQueueTokenByAdmitToken(admitToken)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.INVALID_REQUEST, "유효하지 않은 입장 토큰입니다."));

        QueueStatusSnapshot snapshot = queueStatusStore.findSnapshot(queueToken)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.INVALID_REQUEST, "유효하지 않은 입장 토큰입니다."));

        if (snapshot.status() != QueueRequestStatus.ADMITTED
                || snapshot.scope() != scope
                || !snapshot.sessionId().equals(sessionId)
                || !snapshot.userId().equals(userId)
                || !admitToken.equals(snapshot.admitToken())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "요청한 대기열과 입장 토큰 정보가 일치하지 않습니다.");
        }

        return snapshot;
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
        leave(QueueScope.BOOKING, sessionId, queueToken);
    }

    public void leave(QueueScope scope, Long sessionId, String queueToken) {
        QueueStatusSnapshot snapshot = queueStatusStore.findSnapshot(queueToken)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "없는 대기열 토큰입니다."));
        if (!snapshot.sessionId().equals(sessionId) || snapshot.scope() != scope) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "요청한 대기열과 토큰 정보가 일치하지 않습니다.");
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
        String requestKey = QueueConstants.QUEUE_TOKEN_REQUEST_KEY_PREFIX + requestId;

        // 같은 requestId에 대해 최초 1회만 queueToken을 발급하고, 이후에는 기존 토큰을 재사용한다.
        String existingQueueToken = stringRedisTemplate.opsForValue().get(requestKey);
        if (existingQueueToken != null) {
            return existingQueueToken;
        }

        String queueToken = UUID.randomUUID().toString();

        // 같은 requestId에 대해 queueToken을 한 번만 고정 저장한다.
        Boolean saved = stringRedisTemplate.opsForValue().setIfAbsent(
                requestKey,
                queueToken,
                QueueConstants.QUEUE_TOKEN_TTL
        );
        if (Boolean.TRUE.equals(saved)) {
            return queueToken;
        }

        // 동시에 여러 요청이 들어오면 이미 다른 스레드가 저장한 queueToken을 다시 읽어 반환.
        return stringRedisTemplate.opsForValue().get(requestKey);
    }

    private void deleteRelatedTokens(QueueStatusSnapshot snapshot) {
        stringRedisTemplate.delete(QueueConstants.QUEUE_TOKEN_REQUEST_KEY_PREFIX + snapshot.requestId());
        queueEnterRequestStore.delete(snapshot.scope(), snapshot.userId(), snapshot.sessionId(), snapshot.requestId());
    }

    private long estimateWaitSeconds(Long sessionId, Long rank) {
        return estimateWaitSeconds(QueueScope.BOOKING, sessionId, rank);
    }

    private long estimateWaitSeconds(QueueScope scope, Long sessionId, Long rank) {
        if (rank == null || rank <= 1L) {
            return 0L;
        }

        Instant now = Instant.now();
        long recentAdmissionCount = queueStatusStore.countRecentAdmissions(
                scope,
                sessionId,
                now.minus(QueueConstants.ETA_WINDOW),
                now
        );
        // 아직 admission 기록이 없으면 fallback 처리량으로만 ETA를 추정한다.
        long admissionRatePerMinute = recentAdmissionCount == 0L
                ? QueueConstants.DEFAULT_ADMISSION_RATE_PER_MINUTE
                : Math.max(1L, recentAdmissionCount / QueueConstants.ETA_WINDOW.toMinutes());

        long aheadCount = rank - 1L;
        return Math.max(0L, (aheadCount * 60L) / admissionRatePerMinute);
    }
}
