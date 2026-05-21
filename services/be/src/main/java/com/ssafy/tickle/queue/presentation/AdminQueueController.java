package com.ssafy.tickle.queue.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.common.sse.AdminSseEmitterStore;
import com.ssafy.tickle.queue.application.service.AdminQueueDashboardService;
import com.ssafy.tickle.queue.application.service.QueueStatusService;
import com.ssafy.tickle.queue.presentation.dto.QueueDashboardResponse;
import com.ssafy.tickle.queue.presentation.dto.QueueEventRankResponse;
import com.ssafy.tickle.queue.presentation.dto.QueueStatsResponse;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 어드민 대기열 현황 조회 API 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1/admin/queues")
@RequiredArgsConstructor
public class AdminQueueController implements AdminQueueApiDoc {

    private final QueueStatusService queueStatusService;
    private final AdminQueueDashboardService adminQueueDashboardService;
    private final AdminSseEmitterStore adminSseEmitterStore;

    /**
     * 특정 회차의 대기열 현황 통계를 조회합니다.
     *
     * @param scheduleId 조회할 회차 식별자
     * @return 대기열 현황 통계 응답
     */
    @Override
    @GetMapping("/{scheduleId}/stats")
    public ResponseEntity<BaseResponse<QueueStatsResponse>> getQueueStats(
            @PathVariable Long scheduleId
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(queueStatusService.getQueueStats(scheduleId)));
    }

    @Override
    @GetMapping("/events/{eventId}/dashboard")
    public ResponseEntity<BaseResponse<QueueDashboardResponse>> getEventDashboard(
            @PathVariable Long eventId
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(adminQueueDashboardService.getEventDashboard(eventId)));
    }

    @Override
    @GetMapping("/events/top")
    public ResponseEntity<BaseResponse<List<QueueEventRankResponse>>> getTopWaitingEvents() {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(adminQueueDashboardService.getTopWaitingEvents()));
    }

    /**
     * 특정 공연 대기열 대시보드를 SSE로 구독합니다.
     */
    @Override
    @GetMapping(value = "/events/{eventId}/dashboard/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeEventDashboard(
            @PathVariable Long eventId,
            HttpServletResponse response
    ) {
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache");

        String topic = AdminSseEmitterStore.TOPIC_QUEUE_DASHBOARD_PREFIX + eventId;
        SseEmitter emitter = new SseEmitter(AdminSseEmitterStore.EMITTER_TIMEOUT_MS);
        adminSseEmitterStore.add(topic, emitter);

        try {
            // 연결 즉시 현재 대시보드 1회 전송
            emitter.send(SseEmitter.event()
                    .name("queue.dashboard")
                    .data(adminQueueDashboardService.getEventDashboard(eventId), MediaType.APPLICATION_JSON));
        } catch (IOException e) {
            adminSseEmitterStore.remove(topic, emitter);
        }

        return emitter;
    }

    /**
     * 대기열 상위 랭킹을 SSE로 구독합니다.
     */
    @Override
    @GetMapping(value = "/events/top/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeTopWaitingEvents(HttpServletResponse response) {
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache");

        SseEmitter emitter = new SseEmitter(AdminSseEmitterStore.EMITTER_TIMEOUT_MS);
        adminSseEmitterStore.add(AdminSseEmitterStore.TOPIC_QUEUE_TOP, emitter);

        try {
            // 연결 즉시 현재 랭킹 1회 전송
            emitter.send(SseEmitter.event()
                    .name("queue.top")
                    .data(adminQueueDashboardService.getTopWaitingEvents(), MediaType.APPLICATION_JSON));
        } catch (IOException e) {
            adminSseEmitterStore.remove(AdminSseEmitterStore.TOPIC_QUEUE_TOP, emitter);
        }

        return emitter;
    }
}
