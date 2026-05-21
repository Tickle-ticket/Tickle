package com.ssafy.tickle.seat.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 좌석 SSE 스트림 API 문서 인터페이스입니다.
 */
@Tag(name = "Seat", description = "좌석 API")
public interface SeatSseApiDoc {

    @Operation(summary = "실시간 좌석 상태 구독 (SSE)", description = "특정 회차의 좌석 상태 변경을 SSE로 실시간 수신합니다.")
    @ApiResponse(responseCode = "200", description = "SSE 스트림 연결 성공")
    SseEmitter subscribeSeats(
            @Parameter(description = "이벤트 식별자") Long eventId,
            @Parameter(description = "회차 식별자") Long scheduleId,
            jakarta.servlet.http.HttpServletResponse response
    );
}
