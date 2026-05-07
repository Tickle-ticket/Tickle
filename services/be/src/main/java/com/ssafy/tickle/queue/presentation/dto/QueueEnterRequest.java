package com.ssafy.tickle.queue.presentation.dto;

/**
 * 대기열 진입 등록 요청 DTO입니다.
 *
 * <p>userId는 Authorization 헤더의 JWT에서 추출하므로 요청 바디에 포함하지 않습니다.</p>
 */
public record QueueEnterRequest() {
}
