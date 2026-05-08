package com.ssafy.tickle.queue.presentation;

import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.queue.domain.QueueScope;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterResponse;
import com.ssafy.tickle.queue.presentation.dto.QueueStatusResponse;
import com.ssafy.tickle.queue.presentation.dto.QueueTokenResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 대기열 API 문서 인터페이스입니다.
 */
@Tag(name = "Queue", description = "대기열 API")
public interface QueueApiDoc {

    /**
     * 대기열 진입 등록 API 문서 정의입니다.
     *
     * @param eventId 공연 식별자
     * @param scope   대기열 목적
     * @param userId  JWT에서 추출한 사용자 식별자
     * @return 대기열 진입 접수 응답
     */
    @Operation(
            summary = "대기열 진입 등록",
            description = "사용자의 대기열 진입 요청을 접수하고 비동기 추적용 requestId를 반환합니다."
    )
    @ApiResponse(
            responseCode = "201",
            description = "대기열 진입 요청 접수 성공"
    )
    @ApiResponse(
            responseCode = "400",
            description = "예매 오픈 전이거나 이미 종료된 공연",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    @ApiResponse(
            responseCode = "404",
            description = "대기열 진입용 공연 오픈 정보를 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<QueueEnterResponse>> enter(
            Long eventId,
            QueueScope scope,
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1") @UserId Long userId
    );

    /**
     * requestId 기반 최초 queueToken 발급 API 문서 정의입니다.
     *
     * @param requestId 대기열 진입 요청 식별자
     * @return queueToken 발급 응답
     */
    @Operation(
            summary = "대기열 토큰 발급",
            description = "requestId를 기반으로 최초 queueToken을 발급하고 현재 상태만 반환합니다."
    )
    @ApiResponse(
            responseCode = "200",
            description = "queueToken 발급 성공"
    )
    @ApiResponse(
            responseCode = "404",
            description = "존재하지 않는 대기열 진입 요청",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<QueueTokenResponse>> getToken(
            Long eventId,
            QueueScope scope,
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1") @UserId Long userId,
            String requestId
    );

    /**
     * queueToken 기준 상태 조회 API 문서 정의입니다.
     *
     * @param queueToken 대기열 토큰
     * @return 현재 순번과 ETA를 포함한 대기 상태
     */
    @Operation(
            summary = "대기열 상태 조회",
            description = "queueToken 기준으로 현재 순번, 대기 인원, ETA를 조회합니다."
    )
    @ApiResponse(
            responseCode = "200",
            description = "대기열 상태 조회 성공"
    )
    @ApiResponse(
            responseCode = "404",
            description = "존재하지 않는 대기열 토큰",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<QueueStatusResponse>> getStatus(
            Long eventId,
            QueueScope scope,
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1") @UserId Long userId,
            String queueToken
    );

    @Operation(
            summary = "대기열 이탈",
            description = "queueToken 기준 대기열에서 명시적으로 이탈합니다."
    )
    @ApiResponse(
            responseCode = "200",
            description = "대기열 이탈 성공"
    )
    ResponseEntity<BaseResponse<Void>> leave(
            Long eventId,
            QueueScope scope,
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1") @UserId Long userId,
            String queueToken
    );

    /**
     * queueToken 기준 실시간 대기 상태 SSE API 문서 정의입니다.
     *
     * @param queueToken 대기열 토큰
     * @return 실시간 상태 SSE 스트림
     */
    @Operation(
            summary = "대기열 상태 SSE 구독",
            description = "queueToken 기준으로 현재 순번과 ETA를 실시간으로 push 받습니다."
    )
    @ApiResponse(
            responseCode = "200",
            description = "SSE 연결 성공"
    )
    SseEmitter stream(
            Long eventId,
            QueueScope scope,
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1") @UserId Long userId,
            String queueToken,
            jakarta.servlet.http.HttpServletResponse response
    );
}
