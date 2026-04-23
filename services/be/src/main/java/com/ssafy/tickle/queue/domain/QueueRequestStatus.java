package com.ssafy.tickle.queue.domain;

/**
 * 대기열 진입 요청의 현재 처리 상태를 정의합니다.
 */
public enum QueueRequestStatus {

    // 대기
    PENDING,

    // 대기열 등록 완료
    WAITING,

    // 입장 승인
    ADMITTED,

    // 사용자의 명시적 이탈
    LEFT,

    // heartbeat 미수신 또는 TTL 만료
    EXPIRED
}
