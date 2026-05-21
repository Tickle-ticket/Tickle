package com.ssafy.tickle.blacklist.presentation;

import com.ssafy.tickle.blacklist.application.BlacklistService;
import com.ssafy.tickle.blacklist.presentation.dto.AddBlacklistRequest;
import com.ssafy.tickle.blacklist.presentation.dto.BlacklistPageResponse;
import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.blacklist.application.AdminBlacklistDashboardService;
import com.ssafy.tickle.blacklist.presentation.dto.BlacklistDashboardResponse;
import com.ssafy.tickle.common.sse.AdminSseEmitterStore;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;

/**
 * 어드민 블랙리스트 관리 API를 제공하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1/admin/blacklist")
@RequiredArgsConstructor
public class AdminBlacklistController implements AdminBlacklistApiDoc {

    private final BlacklistService blacklistService;
    private final AdminBlacklistDashboardService adminBlacklistDashboardService;
    private final AdminSseEmitterStore adminSseEmitterStore;

    /**
     * 블랙리스트 목록을 페이지네이션하여 조회합니다.
     *
     * @param page 페이지 번호 (기본값 0)
     * @param size 페이지 크기 (기본값 20)
     * @return 블랙리스트 페이지 응답
     */
    @Override
    @GetMapping
    public ResponseEntity<BaseResponse<BlacklistPageResponse>> getBlacklist(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(blacklistService.getBlacklist(page, size)));
    }

    /**
     * 관리자가 사용자를 블랙리스트에 수동으로 등록합니다.
     *
     * @param adminUserId 관리자 사용자 식별자 (AdminAuthInterceptor에서 검증)
     * @param request     블랙리스트 등록 요청
     * @return 빈 성공 응답
     */
    @Override
    @PostMapping
    public ResponseEntity<BaseResponse<Void>> addBlacklist(
            @RequestParam Long adminUserId,
            @Valid @RequestBody AddBlacklistRequest request
    ) {
        blacklistService.addBlacklist(adminUserId, request);
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK, null));
    }

    /**
     * 블랙리스트 항목을 삭제하여 해당 사용자의 차단을 해제합니다.
     *
     * @param blacklistId 블랙리스트 항목 식별자
     * @return 빈 성공 응답
     */
    @Override
    @DeleteMapping("/{blacklistId}")
    public ResponseEntity<BaseResponse<Void>> removeBlacklist(
            @PathVariable Long blacklistId
    ) {
        blacklistService.removeBlacklist(blacklistId);
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK, null));
    }

    @Override
    @GetMapping("/dashboard")
    public ResponseEntity<BaseResponse<BlacklistDashboardResponse>> getDashboard() {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(adminBlacklistDashboardService.getDashboard()));
    }

    /**
     * 블랙리스트 목록을 SSE로 구독합니다.
     */
    @Override
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeBlacklist(HttpServletResponse response) {
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache");

        SseEmitter emitter = new SseEmitter(AdminSseEmitterStore.EMITTER_TIMEOUT_MS);
        adminSseEmitterStore.add(AdminSseEmitterStore.TOPIC_BLACKLIST_LIST, emitter);

        try {
            // 연결 즉시 1페이지 1회 전송
            emitter.send(SseEmitter.event()
                    .name("blacklist.list")
                    .data(blacklistService.getBlacklist(0, 20), MediaType.APPLICATION_JSON));
        } catch (IOException e) {
            adminSseEmitterStore.remove(AdminSseEmitterStore.TOPIC_BLACKLIST_LIST, emitter);
        }

        return emitter;
    }

    /**
     * 블랙리스트 대시보드를 SSE로 구독합니다.
     */
    @Override
    @GetMapping(value = "/dashboard/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeDashboard(HttpServletResponse response) {
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache");

        SseEmitter emitter = new SseEmitter(AdminSseEmitterStore.EMITTER_TIMEOUT_MS);
        adminSseEmitterStore.add(AdminSseEmitterStore.TOPIC_BLACKLIST_DASHBOARD, emitter);

        try {
            // 연결 즉시 현재 대시보드 1회 전송
            emitter.send(SseEmitter.event()
                    .name("blacklist.dashboard")
                    .data(adminBlacklistDashboardService.getDashboard(), MediaType.APPLICATION_JSON));
        } catch (IOException e) {
            adminSseEmitterStore.remove(AdminSseEmitterStore.TOPIC_BLACKLIST_DASHBOARD, emitter);
        }

        return emitter;
    }
}
