package com.ssafy.tickle.cancellation.presentation;

import com.ssafy.tickle.cancellation.application.CancellationWaitCandidateService;
import com.ssafy.tickle.cancellation.application.CancellationWaitSeatService;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitCandidateCreateRequest;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitCandidateCreateResponse;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitCandidateListResponse;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitSeatMapResponse;
import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
    private final CancellationWaitCandidateService cancellationWaitCandidateService;

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
            @UserId Long userId,
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

    /**
     * 좌석 단위 예매 대기 신청을 생성합니다.
     *
     * @param eventId 공연 식별자
     * @param scheduleId 회차 식별자
     * @param userId 사용자 식별자
     * @param admitToken 예매 대기 큐 입장 토큰
     * @param request 예매 대기 신청 요청
     * @return 생성된 예매 대기 신청 정보
     */
    @Override
    @PostMapping("/events/{eventId}/schedules/{scheduleId}/cancellation-wait/candidates")
    public ResponseEntity<BaseResponse<CancellationWaitCandidateCreateResponse>> createCandidates(
            @PathVariable Long eventId,
            @PathVariable Long scheduleId,
            @UserId Long userId,
            @RequestParam String admitToken,
            @Valid @RequestBody CancellationWaitCandidateCreateRequest request
    ) {
        CancellationWaitCandidateCreateResponse response = cancellationWaitCandidateService.createCandidates(
                eventId,
                scheduleId,
                userId,
                admitToken,
                request
        );

        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK, response));
    }

    /**
     * 사용자의 예매 대기 신청 목록을 조회합니다.
     *
     * @param userId 사용자 식별자
     * @return 예매 대기 신청 목록
     */
    @Override
    @GetMapping("/cancellation-wait/candidates")
    public ResponseEntity<BaseResponse<CancellationWaitCandidateListResponse>> getMyCandidates(
            @UserId Long userId
    ) {
        CancellationWaitCandidateListResponse response = cancellationWaitCandidateService.getMyCandidates(userId);

        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK, response));
    }

    /**
     * 사용자의 예매 대기 신청을 취소합니다.
     *
     * @param candidateId 예매 대기 신청 식별자
     * @param userId 사용자 식별자
     * @return 취소 결과
     */
    @Override
    @DeleteMapping("/cancellation-wait/candidates/{candidateId}")
    public ResponseEntity<BaseResponse<Void>> cancelCandidate(
            @PathVariable Long candidateId,
            @UserId Long userId
    ) {
        cancellationWaitCandidateService.cancelCandidate(candidateId, userId);

        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK));
    }
}
