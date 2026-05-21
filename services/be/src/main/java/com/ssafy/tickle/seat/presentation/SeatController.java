package com.ssafy.tickle.seat.presentation;

import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.queue.application.service.QueueStatusService;
import com.ssafy.tickle.queue.domain.QueueScope;
import com.ssafy.tickle.seat.application.SeatService;
import com.ssafy.tickle.seat.presentation.dto.SeatHoldRequest;
import com.ssafy.tickle.seat.presentation.dto.SeatHoldResponse;
import com.ssafy.tickle.seat.presentation.dto.SeatMapResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    private final QueueStatusService queueStatusService;

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

    @Override
    @PostMapping("/events/{eventId}/schedules/{scheduleId}/seats/hold")
    public ResponseEntity<BaseResponse<SeatHoldResponse>> holdSeats(
            @PathVariable Long eventId,
            @PathVariable Long scheduleId,
            @UserId Long userId,
            @RequestParam String admitToken,
            @Valid @RequestBody SeatHoldRequest request
    ) {
        queueStatusService.validateAdmitToken(QueueScope.BOOKING, eventId, userId, admitToken);
        SeatHoldResponse response = seatService.holdSeats(eventId, scheduleId, userId, request);
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK, response));
    }

    @Override
    @DeleteMapping("/events/{eventId}/schedules/{scheduleId}/seats/hold")
    public ResponseEntity<BaseResponse<Void>> releaseSeats(
            @PathVariable Long eventId,
            @PathVariable Long scheduleId,
            @UserId Long userId
    ) {
        seatService.releaseSeats(eventId, scheduleId, userId);
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK, null));
    }
}
