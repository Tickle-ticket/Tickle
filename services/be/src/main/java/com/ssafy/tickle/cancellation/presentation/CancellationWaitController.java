package com.ssafy.tickle.cancellation.presentation;

import com.ssafy.tickle.cancellation.application.CancellationWaitSeatService;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitSeatMapResponse;
import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 예매 대기 API를 제공합니다.
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CancellationWaitController implements CancellationWaitApiDoc {

    private final CancellationWaitSeatService cancellationWaitSeatService;

    /**
     * 예매 대기 페이지용 좌석 목록을 조회합니다.
     *
     * @param eventId 공연 식별자
     * @param scheduleId 회차 식별자
     * @param userId 사용자 식별자
     * @param admitToken 예매 대기 큐 입장 토큰
     * @return 좌석별 예매 대기 현황
     */
    @Override
    @GetMapping("/events/{eventId}/schedules/{scheduleId}/cancellation-wait/seats")
    public ResponseEntity<BaseResponse<CancellationWaitSeatMapResponse>> getSeats(
            @PathVariable Long eventId,
            @PathVariable Long scheduleId,
            @RequestParam Long userId,
            @RequestParam String admitToken
    ) {
        CancellationWaitSeatMapResponse response = cancellationWaitSeatService.getSeats(
                eventId,
                scheduleId,
                userId,
                admitToken
        );

        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK, response));
    }
}
