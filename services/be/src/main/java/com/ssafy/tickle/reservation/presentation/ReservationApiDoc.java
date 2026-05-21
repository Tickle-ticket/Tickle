package com.ssafy.tickle.reservation.presentation;

import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.reservation.presentation.dto.ReservationDetailResponse;
import com.ssafy.tickle.reservation.presentation.dto.ReservationListResponse;
import com.ssafy.tickle.reservation.presentation.dto.ReservationOwnershipCountResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
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
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1") @UserId Long userId
    );

    /**
     * 회차별 보유/대기 좌석 수 조회 API 문서 정의입니다.
     */
    @Operation(
            summary = "회차별 보유/대기 좌석 수 조회",
            description = """
                    로그인한 사용자가 특정 회차에서 이미 점유한 좌석 수를 반환한다.

                    - 예매 티켓은 PENDING_PAYMENT / BOOKED 상태를 포함한다.
                    - 무통장 입금 대기 중인 티켓도 소유 티켓으로 계산한다.
                    - 취소표 대기는 WAITING / OFFERED 상태를 포함한다.
                    """
    )
    @ApiResponse(responseCode = "200", description = "보유/대기 좌석 수 조회 성공")
    @ApiResponse(responseCode = "404", description = "공연/회차 없음")
    ResponseEntity<BaseResponse<ReservationOwnershipCountResponse>> getOwnershipCount(
            @Parameter(description = "공연 식별자", required = true, example = "3001") @RequestParam Long eventId,
            @Parameter(description = "회차 식별자", required = true, example = "3001") @RequestParam Long scheduleId,
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1") @UserId Long userId
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
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1") @UserId Long userId
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
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1") @UserId Long userId
    );
}
