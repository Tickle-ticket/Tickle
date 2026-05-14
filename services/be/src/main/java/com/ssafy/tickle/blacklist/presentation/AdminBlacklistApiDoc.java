package com.ssafy.tickle.blacklist.presentation;

import com.ssafy.tickle.blacklist.presentation.dto.AddBlacklistRequest;
import com.ssafy.tickle.blacklist.presentation.dto.BlacklistPageResponse;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.blacklist.presentation.dto.BlacklistDashboardResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 어드민 블랙리스트 API 문서 인터페이스입니다.
 */
@Tag(name = "Admin", description = "어드민 API")
public interface AdminBlacklistApiDoc {

    /**
     * 블랙리스트 목록 조회 API 문서 정의입니다.
     *
     * @param page 페이지 번호 (0-based)
     * @param size 페이지 크기
     * @return 블랙리스트 페이지 응답
     */
    @Operation(
            summary = "블랙리스트 목록 조회",
            description = "블랙리스트에 등록된 사용자 목록을 페이지네이션하여 조회합니다."
    )
    @ApiResponse(responseCode = "200", description = "블랙리스트 목록 조회 성공")
    ResponseEntity<BaseResponse<BlacklistPageResponse>> getBlacklist(
            @Parameter(description = "페이지 번호", example = "0") int page,
            @Parameter(description = "페이지 크기", example = "20") int size
    );

    /**
     * 블랙리스트 수동 추가 API 문서 정의입니다.
     *
     * @param adminUserId 관리자 사용자 식별자
     * @param request     블랙리스트 등록 요청
     * @return 빈 성공 응답
     */
    @Operation(
            summary = "블랙리스트 수동 추가",
            description = "관리자가 특정 사용자를 블랙리스트에 수동으로 등록합니다."
    )
    @ApiResponse(responseCode = "200", description = "블랙리스트 등록 성공")
    @ApiResponse(
            responseCode = "409",
            description = "이미 블랙리스트에 등록된 사용자",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    @ApiResponse(
            responseCode = "400",
            description = "유효하지 않은 사유 값",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<Void>> addBlacklist(
            @Parameter(description = "관리자 사용자 식별자", required = true, example = "1") Long adminUserId,
            AddBlacklistRequest request
    );

    /**
     * 블랙리스트 해제 API 문서 정의입니다.
     *
     * @param blacklistId 블랙리스트 항목 식별자
     * @return 빈 성공 응답
     */
    @Operation(
            summary = "블랙리스트 해제",
            description = "특정 블랙리스트 항목을 삭제하여 해당 사용자의 차단을 해제합니다."
    )
    @ApiResponse(responseCode = "200", description = "블랙리스트 해제 성공")
    @ApiResponse(
            responseCode = "404",
            description = "블랙리스트 항목을 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<Void>> removeBlacklist(
            @Parameter(description = "블랙리스트 항목 식별자", required = true, example = "1") Long blacklistId
    );

    @Operation(
            summary = "봇 탐지 현황 대시보드 조회",
            description = "오늘 기준의 전체 접속자 수, 탐지/차단율, 시간대별 탐지 그래프 데이터를 반환합니다."
    )
    @ApiResponse(responseCode = "200", description = "대시보드 조회 성공")
    ResponseEntity<BaseResponse<BlacklistDashboardResponse>> getDashboard();

    /**
     * 블랙리스트 목록 실시간 구독 API 문서 정의입니다.
     */
    @Operation(
            summary = "블랙리스트 목록 구독 (SSE)",
            description = "30초마다 블랙리스트 최신 1페이지를 push합니다."
    )
    SseEmitter subscribeBlacklist(HttpServletResponse response);

    /**
     * 봇 탐지 현황 대시보드 실시간 구독 API 문서 정의입니다.
     */
    @Operation(
            summary = "봇 탐지 현황 대시보드 구독 (SSE)",
            description = "10초마다 봇 탐지 현황 대시보드 데이터를 push합니다."
    )
    SseEmitter subscribeDashboard(HttpServletResponse response);
}
