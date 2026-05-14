package com.ssafy.tickle.user.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.common.sse.AdminSseEmitterStore;
import com.ssafy.tickle.user.application.ActiveUserStatsService;
import com.ssafy.tickle.user.presentation.dto.ActiveUserStatsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
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
 * 관리자 전용 사용자 접속 통계 API 컨트롤러입니다.
 */
@Tag(name = "Admin User Stats", description = "관리자 사용자 접속 통계 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/users")
public class AdminUserStatsController {

    private final ActiveUserStatsService activeUserStatsService;
    private final AdminSseEmitterStore adminSseEmitterStore;

    /**
     * 오늘 기준 실시간 일반 사용자(USER 권한) 접속 통계를 조회합니다.
     */
    @Operation(
            summary = "실시간 접속자 통계 조회 (REST)",
            description = "기획사·관리자를 제외한 일반 사용자(USER 권한)의 당일 현재/피크/평균 접속자 수를 반환합니다."
    )
    @ApiResponse(responseCode = "200", description = "통계 조회 성공")
    @GetMapping("/stats")
    public ResponseEntity<BaseResponse<ActiveUserStatsResponse>> getActiveUserStats() {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(activeUserStatsService.getStats()));
    }

    /**
     * 실시간 사용자 접속 통계를 SSE로 구독합니다.
     */
    @Operation(
            summary = "실시간 접속자 통계 구독 (SSE)",
            description = "10초마다 실시간 접속자 통계를 push합니다."
    )
    @GetMapping(value = "/stats/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeUserStats(HttpServletResponse response) {
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache");

        SseEmitter emitter = new SseEmitter(AdminSseEmitterStore.EMITTER_TIMEOUT_MS);
        adminSseEmitterStore.add(AdminSseEmitterStore.TOPIC_USER_STATS, emitter);

        try {
            // 연결 즉시 현재 데이터 1회 전송
            emitter.send(SseEmitter.event()
                    .name("users.stats")
                    .data(activeUserStatsService.getStats(), MediaType.APPLICATION_JSON));
        } catch (IOException e) {
            adminSseEmitterStore.remove(AdminSseEmitterStore.TOPIC_USER_STATS, emitter);
        }

        return emitter;
    }
}
