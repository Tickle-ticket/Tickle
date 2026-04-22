package com.ssafy.tickle.queue.presentation.dto;

import com.ssafy.tickle.queue.domain.cache.QueueRequestStatus;

/**
 * 대기열 진입 등록 응답 DTO입니다.
 *
 * @param requestId 비동기 등록 추적용 요청 식별자
 * @param status 현재 처리 상태
 */
public record QueueEnterResponse(
        String requestId,
        QueueRequestStatus status
) {

    /**
     * 진입 등록 접수 응답을 생성합니다.
     *
     * @param requestId 비동기 등록 추적용 요청 식별자
     * @return 대기열 진입 등록 응답
     */
    public static QueueEnterResponse pending(String requestId) {
        return new QueueEnterResponse(requestId, QueueRequestStatus.PENDING);
    }
}
