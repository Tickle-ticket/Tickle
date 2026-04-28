package com.ssafy.tickle.seat.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.seat.presentation.dto.SeatMapResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * 좌석 API Swagger 문서 인터페이스입니다.
 */
@Tag(name = "Seat", description = "좌석 API")
public interface SeatApiDoc {

    @Operation(
            summary = "좌석 배치도 조회",
            description = """
                    공연 회차의 전체 좌석 상태를 구역별로 반환합니다.
                    
                    좌석 위치(좌표)는 FE 하드코딩으로 관리하며, 이 API는 **상태(saleStatus)만 반환**합니다.
                    FE는 이 응답과 하드코딩 배치도를 합산하여 배치도를 렌더링합니다.
                    
                    최초 진입 시 1회만 호출하며, 이후 실시간 변경분은 WebSocket(/topic/seats/{scheduleId})으로 수신합니다.
                    
                    **saleStatus 종류**
                    - AVAILABLE: 빈 좌석 (선점 가능)
                    - HELD: 선점 중 (15분 TTL, 취소표 대기 신청 불가)
                    - PENDING: 입금대기 (24시간 TTL, 취소표 대기 신청 가능)
                    - CONFIRMED: 예매 확정 (취소표 대기 신청 가능)
                    - BLOCKED: 관리자 지정 차단
                    - UNAVAILABLE: 물리적 사용 불가
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "좌석 배치도 조회 성공"),
            @ApiResponse(responseCode = "404", description = "공연 또는 회차를 찾을 수 없음")
    })
    ResponseEntity<BaseResponse<SeatMapResponse>> getSeatMap(
            @Parameter(description = "공연 식별자", required = true, example = "1")
            @PathVariable Long eventId,
            @Parameter(description = "회차 식별자", required = true, example = "1")
            @PathVariable Long scheduleId
    );
}
