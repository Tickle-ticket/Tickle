package com.ssafy.tickle.seat.presentation;

import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.seat.application.SeatService;
import com.ssafy.tickle.seat.presentation.dto.SeatMapResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 좌석 API를 제공하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Seat", description = "좌석 API")
public class SeatController implements SeatApiDoc {

    private final SeatService seatService;

    /**
     * 공연 회차의 좌석 배치도(상태)를 구역별로 조회합니다.
     *
     * @param eventId    공연 식별자
     * @param scheduleId 회차 식별자
     * @return 구역별 좌석 상태 배치도
     */
    @Override
    @GetMapping("/events/{eventId}/schedules/{scheduleId}/seats")
    public ResponseEntity<BaseResponse<SeatMapResponse>> getSeatMap(
            @PathVariable Long eventId,
            @PathVariable Long scheduleId
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK, seatService.getSeatMap(eventId, scheduleId)));
    }
}
