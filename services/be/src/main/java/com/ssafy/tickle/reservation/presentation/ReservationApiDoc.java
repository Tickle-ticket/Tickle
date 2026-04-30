package com.ssafy.tickle.reservation.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.reservation.presentation.dto.ReservationDetailResponse;
import com.ssafy.tickle.reservation.presentation.dto.ReservationListResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * 예매 API 문서 인터페이스입니다.
 */
@Tag(name = "Reservation", description = "예매 목록 조회 / 상세 조회 / 취소 API")
public interface ReservationApiDoc {

    /**
     * 예매 내역 목록 조회 API 문서 정의입니다.
     */
    @Operation(
            summary = "예매 내역 목록 조회",
            description = "로그인한 사용자의 전체 예매 이력을 최신순으로 반환한다. 모든 상태의 예매를 포함한다."
    )
    @ApiResponse(responseCode = "200", description = "예매 목록 조회 성공")
    ResponseEntity<BaseResponse<ReservationListResponse>> getReservationList(
            @Parameter(description = "사용자 식별자 (임시 - 추후 JWT에서 추출)") Long userId
    );

    /**
     * 예매 상세 조회 API 문서 정의입니다.
     */
    @Operation(
            summary = "예매 상세 조회",
            description = "특정 예매의 상세 정보(공연 정보, 티켓 목록 등)를 반환한다. 본인 예매만 조회 가능."
    )
    @ApiResponse(responseCode = "200", description = "예매 상세 조회 성공")
    @ApiResponse(responseCode = "403", description = "접근 권한 없음 (타인 예매)")
    @ApiResponse(responseCode = "404", description = "예매 없음")
    ResponseEntity<BaseResponse<ReservationDetailResponse>> getReservationDetail(
            @Parameter(description = "예매 식별자") Long reservationId,
            @Parameter(description = "사용자 식별자 (임시)") Long userId
    );

    /**
     * 예매 취소 API 문서 정의입니다.
     */
    @Operation(
            summary = "예매 취소",
            description = "CONFIRMED / PENDING_PAYMENT 상태의 예매를 취소한다. Kafka로 booking.cancel.request 이벤트 발행."
    )
    @ApiResponse(responseCode = "200", description = "예매 취소 성공")
    @ApiResponse(responseCode = "400", description = "취소 불가 상태")
    @ApiResponse(responseCode = "403", description = "접근 권한 없음")
    @ApiResponse(responseCode = "404", description = "예매 없음")
    @ApiResponse(responseCode = "409", description = "이미 취소된 예매")
    ResponseEntity<BaseResponse<Void>> cancelReservation(
            @Parameter(description = "예매 식별자") Long reservationId,
            @Parameter(description = "사용자 식별자 (임시)") Long userId
    );
}
