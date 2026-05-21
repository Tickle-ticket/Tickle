package com.ssafy.tickle.cancellation.presentation;

import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitSeatMapResponse;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitCandidateCreateRequest;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitCandidateCreateResponse;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitCandidateListResponse;
import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.response.BaseResponse;
import io.swagger.v3.oas.annotations.Parameter;
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
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1")
            @UserId
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
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1")
            @UserId
            Long userId,
            String admitToken,
            CancellationWaitCandidateCreateRequest request
    );

    /**
     * 사용자의 활성 예매 대기 신청 목록을 조회합니다.
     *
     * @param userId 사용자 식별자
     * @return 예매 대기 신청 목록
     */
    @Operation(
            summary = "내 예매 대기 목록 조회",
            description = "사용자의 활성 예매 대기 신청 목록을 공연명, 좌석 정보, 현재 순위와 함께 조회합니다."
    )
    @ApiResponse(responseCode = "200", description = "예매 대기 목록 조회 성공")
    ResponseEntity<BaseResponse<CancellationWaitCandidateListResponse>> getMyCandidates(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1") @UserId Long userId
    );

    /**
     * 사용자의 예매 대기 신청을 취소합니다.
     *
     * @param candidateId 예매 대기 신청 식별자
     * @param userId 사용자 식별자
     * @return 취소 결과
     */
    @Operation(
            summary = "예매 대기 취소",
            description = "아직 취소표 제안을 받지 않은 사용자의 예매 대기 신청만 취소합니다."
    )
    @ApiResponse(responseCode = "200", description = "예매 대기 취소 성공")
    ResponseEntity<BaseResponse<Void>> cancelCandidate(
            Long candidateId,
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1") @UserId Long userId
    );
}
