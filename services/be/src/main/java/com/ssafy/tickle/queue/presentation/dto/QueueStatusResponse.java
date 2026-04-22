package com.ssafy.tickle.queue.presentation.dto;

import com.ssafy.tickle.queue.domain.QueueRequestStatus;

import java.time.Instant;

/**
 * 대기열 상태 조회 응답 DTO입니다.
 *
 * @param queueToken 최초 발급된 대기열 토큰
 * @param status 현재 대기 상태
 * @param rank 현재 대기 순번
 * @param waitingCount 현재 대기 인원 수
 * @param estimatedWaitSeconds 예상 대기 시간(초)
 * @param estimatedEntryAt 예상 입장 시각
 */
public record QueueStatusResponse(
        String queueToken,
        QueueRequestStatus status,
        Long rank,
        Long waitingCount,
        Long estimatedWaitSeconds,
        Instant estimatedEntryAt
) {

    /**
     * WAITING 상태 응답을 생성합니다.
     *
     * @param queueToken 대기열 토큰
     * @param rank 현재 대기 순번
     * @param waitingCount 현재 대기 인원 수
     * @param estimatedWaitSeconds 예상 대기 시간(초)
     * @param estimatedEntryAt 예상 입장 시각
     * @return 상태 조회 응답
     */
    public static QueueStatusResponse waiting(
            String queueToken,
            Long rank,
            Long waitingCount,
            Long estimatedWaitSeconds,
            Instant estimatedEntryAt
    ) {
        return new QueueStatusResponse(
                queueToken,
                QueueRequestStatus.WAITING,
                rank,
                waitingCount,
                estimatedWaitSeconds,
                estimatedEntryAt
        );
    }
}
