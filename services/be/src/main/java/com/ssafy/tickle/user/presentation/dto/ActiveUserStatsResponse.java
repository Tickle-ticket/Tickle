package com.ssafy.tickle.user.presentation.dto;

/**
 * 실시간 일반 사용자(USER 권한) 접속 통계 응답 DTO입니다.
 *
 * @param currentCount  현재 활성 접속자 수 (최근 30분 이내 API 요청을 보낸 사용자)
 * @param peakCount     오늘 피크 접속자 수
 * @param averageCount  오늘 평균 접속자 수
 */
public record ActiveUserStatsResponse(
        long currentCount,
        long peakCount,
        long averageCount
) {
}
