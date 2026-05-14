package com.ssafy.tickle.blacklist.presentation;

import com.ssafy.tickle.blacklist.application.BotDetectionService;
import com.ssafy.tickle.blacklist.presentation.dto.BotDetectionStatsResponse;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.common.sse.AdminSseEmitterStore;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;

/**
 * 어드민 봇 탐지 현황 API를 제공하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1/admin/bot")
@RequiredArgsConstructor
public class AdminBotDetectionController implements AdminBotDetectionApiDoc {

    private final BotDetectionService botDetectionService;
    private final AdminSseEmitterStore adminSseEmitterStore;

    /**
     * 봇 탐지 현황 통계를 조회합니다.
     *
     * @return 봇 탐지 현황 통계 응답
     */
    @Override
    @GetMapping("/stats")
    public ResponseEntity<BaseResponse<BotDetectionStatsResponse>> getStats() {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(botDetectionService.getStats()));
    }

    /**
     * 봇 탐지 현황을 SSE로 구독합니다.
     */
    @Override
    @GetMapping(value = "/stats/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeBotStats(HttpServletResponse response) {
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache");

        SseEmitter emitter = new SseEmitter(AdminSseEmitterStore.EMITTER_TIMEOUT_MS);
        adminSseEmitterStore.add(AdminSseEmitterStore.TOPIC_BOT_STATS, emitter);

        try {
            // 연결 즉시 현재 데이터 1회 전송
            emitter.send(SseEmitter.event()
                    .name("bot.stats")
                    .data(botDetectionService.getStats(), MediaType.APPLICATION_JSON));
        } catch (IOException e) {
            adminSseEmitterStore.remove(AdminSseEmitterStore.TOPIC_BOT_STATS, emitter);
        }

        return emitter;
    }
}
