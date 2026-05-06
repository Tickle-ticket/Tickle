package com.ssafy.tickle.cancellation.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 예매 대기 좌석 SSE API 문서 인터페이스입니다.
 */
@Tag(name = "CancellationWait", description = "예매 대기 API")
public interface CancellationWaitSeatSseApiDoc {

    /**
     * 예매 대기 좌석별 대기 인원 변경을 SSE로 구독합니다.
     *
     * @param eventId 공연 식별자
     * @param scheduleId 회차 식별자
     * @param userId 사용자 식별자
     * @param admitToken 예매 대기 큐 입장 토큰
     * @return SSE Emitter
     */
    @Operation(
            summary = "예매 대기 좌석 상태 구독 (SSE)",
            description = "예매 대기 큐 admitToken 검증 후 좌석별 대기 인원 변경을 실시간 수신합니다."
    )
    @ApiResponse(responseCode = "200", description = "SSE 스트림 연결 성공")
    SseEmitter subscribeCancellationWaitSeats(
            Long eventId,
            Long scheduleId,
            Long userId,
            String admitToken
    );
}
