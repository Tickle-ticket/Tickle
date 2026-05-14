package com.ssafy.tickle.queue.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.queue.presentation.dto.QueueDashboardResponse;
import com.ssafy.tickle.queue.presentation.dto.QueueEventRankResponse;
import com.ssafy.tickle.queue.presentation.dto.QueueStatsResponse;

import java.util.List;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 어드민 대기열 현황 조회 API 문서 인터페이스입니다.
 */
@Tag(name = "Admin", description = "어드민 API")
public interface AdminQueueApiDoc {

    /**
     * 특정 회차 대기열 현황 통계 조회 API 문서 정의입니다.
     *
     * @param scheduleId 조회할 회차 식별자
     * @return 대기열 현황 통계 응답
     */
    @Operation(
            summary = "대기열 현황 조회",
            description = """
                    특정 공연 회차의 실시간 대기열 현황을 반환합니다.
                    - totalWaiting: 현재 대기 중인 총 인원 (WAITING 상태)
                    - processingCount: 현재 입장 허용된 인원 (ADMITTED 상태, 좌석 선택/결제 중)
                    - averageWaitSeconds: 예상 평균 대기 시간 (초, 대기열 중간 순번 기준 ETA)
                    - slotLimit: 동시 입장 허용 최대 인원
                    
                    데이터는 Redis에서 실시간 조회되어 DB 부하 없이 빠르게 응답합니다.
                    """
    )
    @ApiResponse(responseCode = "200", description = "대기열 현황 조회 성공")
    ResponseEntity<BaseResponse<QueueStatsResponse>> getQueueStats(
            @Parameter(description = "조회할 공연 회차 식별자", required = true, example = "1")
            @PathVariable Long scheduleId
    );

    @Operation(
            summary = "공연 대기열 대시보드 조회",
            description = "특정 공연 전체의 1시간 동안의 대기열 시계열 차트 데이터 및 요약 통계를 반환합니다."
    )
    @ApiResponse(responseCode = "200", description = "대시보드 조회 성공")
    ResponseEntity<BaseResponse<QueueDashboardResponse>> getEventDashboard(
            @Parameter(description = "조회할 공연 식별자", required = true, example = "1")
            @PathVariable Long eventId
    );

    @Operation(
            summary = "실시간 대기열 많은 공연 목록 조회",
            description = "현재 대기열이 존재하는 모든 공연을 대기자 수 내림차순으로 정렬하여 반환합니다."
    )
    @ApiResponse(responseCode = "200", description = "공연 목록 조회 성공")
    ResponseEntity<BaseResponse<List<QueueEventRankResponse>>> getTopWaitingEvents();

    /**
     * 특정 공연 대기열 대시보드 실시간 구독 API 문서 정의입니다.
     */
    @Operation(
            summary = "공연 대기열 대시보드 구독 (SSE)",
            description = "2초마다 공연 대기열 대시보드 데이터를 push합니다."
    )
    SseEmitter subscribeEventDashboard(
            @Parameter(description = "구독할 공연 식별자", required = true, example = "1")
            @PathVariable Long eventId,
            HttpServletResponse response
    );

    /**
     * 실시간 대기열 많은 공연 목록 구독 API 문서 정의입니다.
     */
    @Operation(
            summary = "대기열 많은 공연 목록 구독 (SSE)",
            description = "2초마다 대기열 상위 랭킹 데이터를 push합니다."
    )
    SseEmitter subscribeTopWaitingEvents(HttpServletResponse response);
}
