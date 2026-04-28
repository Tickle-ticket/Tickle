package com.ssafy.tickle.seat.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.seat.presentation.dto.SeatHoldRequest;
import com.ssafy.tickle.seat.presentation.dto.SeatHoldResponse;
import com.ssafy.tickle.seat.presentation.dto.SeatMapResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

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

    @Operation(
            summary = "좌석 선점",
            description = """
                    선택한 좌석 전체를 동시에 선점합니다 (All-or-Nothing).
                    
                    - 세션 단위 Redis 분산 락으로 동시 요청을 직렬화합니다.
                    - 하나라도 AVAILABLE이 아닌 좌석이 포함되면 전체 실패합니다.
                    - 성공 시 Redis에 15분 TTL 키를 등록합니다.
                    - 15분 내 결제 미완료 시 자동 해제됩니다 (WebSocket 이슈에서 구현 예정).
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "좌석 선점 성공"),
            @ApiResponse(responseCode = "404", description = "공연, 회차 또는 좌석을 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "이미 선점된 좌석 포함 또는 락 획득 실패")
    })
    ResponseEntity<BaseResponse<SeatHoldResponse>> holdSeats(
            @Parameter(description = "공연 식별자", required = true, example = "1")
            @PathVariable Long eventId,
            @Parameter(description = "회차 식별자", required = true, example = "1")
            @PathVariable Long scheduleId,
            @Parameter(description = "사용자 식별자", required = true, example = "1")
            @RequestParam Long userId,
            @Valid @RequestBody SeatHoldRequest request
    );

    @Operation(
            summary = "좌석 선점 해제",
            description = """
                    사용자가 선점한 좌석 전체를 해제합니다.
                    
                    - Redis에서 해당 사용자의 선점 좌석 목록을 조회하여 일괄 해제합니다.
                    - 이미 해제된 경우 200을 반환합니다 (멱등성 보장).
                    - 결제 시간 초과·이탈 시 자동 호출됩니다.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "좌석 선점 해제 성공"),
            @ApiResponse(responseCode = "404", description = "공연 또는 회차를 찾을 수 없음")
    })
    ResponseEntity<BaseResponse<Void>> releaseSeats(
            @Parameter(description = "공연 식별자", required = true, example = "1")
            @PathVariable Long eventId,
            @Parameter(description = "회차 식별자", required = true, example = "1")
            @PathVariable Long scheduleId,
            @Parameter(description = "사용자 식별자", required = true, example = "1")
            @RequestParam Long userId
    );
}
