package com.ssafy.tickle.cancellation.presentation;

import com.ssafy.tickle.cancellation.application.CancellationWaitSeatSseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 예매 대기 좌석 상태 SSE 스트림을 제공하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1/events/{eventId}/schedules/{scheduleId}/cancellation-wait/seats")
@RequiredArgsConstructor
public class CancellationWaitSeatSseController implements CancellationWaitSeatSseApiDoc {

    private final CancellationWaitSeatSseService cancellationWaitSeatSseService;

    /**
     * 특정 회차의 예매 대기 좌석 상태 변경을 SSE로 구독합니다.
     *
     * @param eventId 공연 식별자
     * @param scheduleId 회차 식별자
     * @param userId 사용자 식별자
     * @param admitToken 예매 대기 큐 입장 토큰
     * @return SSE Emitter
     */
    @Override
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeCancellationWaitSeats(
            @PathVariable Long eventId,
            @PathVariable Long scheduleId,
            @RequestParam Long userId,
            @RequestParam String admitToken
    ) {
        return cancellationWaitSeatSseService.subscribe(eventId, scheduleId, userId, admitToken);
    }
}
