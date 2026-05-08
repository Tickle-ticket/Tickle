package com.ssafy.tickle.seat.presentation;

import com.ssafy.tickle.seat.infrastructure.sse.SeatSseEmitterRepository;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;

/**
 * 실시간 좌석 상태 SSE 스트림을 제공하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1/events/{eventId}/schedules/{scheduleId}/seats")
@RequiredArgsConstructor
public class SeatSseController implements SeatSseApiDoc {

    private final SeatSseEmitterRepository sseEmitterRepository;

    /**
     * 특정 회차의 좌석 상태 변경을 SSE로 구독합니다.
     *
     * @param eventId    이벤트 식별자
     * @param scheduleId 회차 식별자
     * @return SSE Emitter
     */
    @Override
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeSeats(
            @PathVariable Long eventId,
            @PathVariable Long scheduleId,
            HttpServletResponse response
    ) {
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache");
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);
        sseEmitterRepository.add(scheduleId, emitter);

        try {
            emitter.send(SseEmitter.event().comment("connected"));
        } catch (IOException e) {
            sseEmitterRepository.remove(scheduleId, emitter);
        }

        return emitter;
    }
}
