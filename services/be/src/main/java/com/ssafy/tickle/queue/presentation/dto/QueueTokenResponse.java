package com.ssafy.tickle.queue.presentation.dto;

import com.ssafy.tickle.queue.domain.QueueRequestStatus;

/**
 * 최초 queueToken 발급 응답 DTO입니다.
 *
 * @param queueToken 발급된 대기열 토큰. 아직 consumer 처리가 끝나지 않았으면 null
 * @param status 현재 대기 상태
 */
public record QueueTokenResponse(
        String queueToken,
        QueueRequestStatus status
) {

    /**
     * WAITING 상태의 queueToken 발급 응답을 생성합니다.
     *
     * @param queueToken 발급된 대기열 토큰
     * @return queueToken 응답
     */
    public static QueueTokenResponse waiting(String queueToken) {
        return new QueueTokenResponse(queueToken, QueueRequestStatus.WAITING);
    }

    public static QueueTokenResponse pending() {
        return new QueueTokenResponse(null, QueueRequestStatus.PENDING);
    }
}
