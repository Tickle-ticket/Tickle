package com.ssafy.tickle.queue.presentation.dto;

/**
 * 어드민용 특정 회차 대기열 현황 통계 응답 DTO입니다.
 *
 * @param scheduleId         회차 식별자
 * @param totalWaiting       현재 대기 중인 총 인원 (WAITING 상태)
 * @param processingCount    현재 입장 허용된 인원 (ADMITTED 상태, 좌석 선택/결제 중)
 * @param averageWaitSeconds 예상 평균 대기 시간 (초)
 * @param slotLimit          동시 입장 허용 최대 인원
 */
public record QueueStatsResponse(
        Long scheduleId,
        long totalWaiting,
        long processingCount,
        long averageWaitSeconds,
        long slotLimit
) {
}
