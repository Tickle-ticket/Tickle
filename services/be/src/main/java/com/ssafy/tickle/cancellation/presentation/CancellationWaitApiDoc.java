package com.ssafy.tickle.cancellation.presentation;

import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitSeatMapResponse;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitCandidateCreateRequest;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitCandidateCreateResponse;
import com.ssafy.tickle.common.response.BaseResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;

/**
 * 예매 대기 API 문서 인터페이스입니다.
 */
@Tag(name = "CancellationWait", description = "예매 대기 API")
public interface CancellationWaitApiDoc {

    /**
     * 예매 대기 페이지용 좌석 목록을 조회합니다.
     *
     * @param eventId 공연 식별자
     * @param scheduleId 회차 식별자
     * @param userId 사용자 식별자
     * @param admitToken 예매 대기 큐 입장 토큰
     * @return 좌석별 예매 대기 현황
     */
    @Operation(
            summary = "예매 대기 좌석 조회",
            description = "예매 대기 큐 admitToken 검증 후 좌석별 대기 인원을 조회합니다."
    )
    @ApiResponse(responseCode = "200", description = "예매 대기 좌석 조회 성공")
    ResponseEntity<BaseResponse<CancellationWaitSeatMapResponse>> getSeats(
            Long eventId,
            Long scheduleId,
            Long userId,
            String admitToken
    );

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
    @Operation(
            summary = "예매 대기 신청",
            description = "예매 대기 큐 admitToken 검증 후 좌석 단위 예매 대기 신청을 생성합니다."
    )
    @ApiResponse(responseCode = "200", description = "예매 대기 신청 성공")
    ResponseEntity<BaseResponse<CancellationWaitCandidateCreateResponse>> createCandidates(
            Long eventId,
            Long scheduleId,
            Long userId,
            String admitToken,
            CancellationWaitCandidateCreateRequest request
    );
}
