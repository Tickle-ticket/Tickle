package com.ssafy.tickle.queue.presentation;

import com.ssafy.tickle.queue.application.service.QueueStatusService;
import com.ssafy.tickle.queue.presentation.dto.QueueStatsResponse;
import com.ssafy.tickle.common.response.BaseResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 어드민 대기열 현황 조회 API 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1/admin/queues")
@RequiredArgsConstructor
public class AdminQueueController implements AdminQueueApiDoc {

    private final QueueStatusService queueStatusService;

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
}
