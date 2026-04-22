package com.ssafy.tickle.queue.presentation.dto;

import com.ssafy.tickle.queue.domain.cache.QueueRequestStatus;

/**
 * 대기열 상태 조회 응답 DTO입니다.
 *
 * @param queueToken 최초 발급된 대기열 토큰
 * @param status 현재 대기 상태
 */
public record QueueStatusResponse(
        String queueToken,
        QueueRequestStatus status
) {

    /**
     * 최초 queueToken 발급 응답을 생성합니다.
     *
     * @param queueToken 대기열 토큰
     * @return 상태 조회 응답
     */
    public static QueueStatusResponse waiting(String queueToken) {
        return new QueueStatusResponse(queueToken, QueueRequestStatus.WAITING);
    }
}
