package com.ssafy.tickle.cancellation.presentation;

import com.ssafy.tickle.cancellation.presentation.dto.CancellationOfferDetailResponse;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationPurchaseRequest;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationPurchaseResponse;
import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.response.BaseResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;

@Tag(name = "Cancellation Redistribution", description = "취소표 재배분 관련 API")
public interface CancellationRedistributionApiDoc {

    @Operation(summary = "취소표 제안 상세 조회", description = "SMS 알림을 받은 대기 후보가 취소표 상세 정보(좌석, 금액, 타이머)를 조회합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "404", description = "제안을 찾을 수 없거나 이미 만료됨"),
            @ApiResponse(responseCode = "403", description = "자신의 취소표가 아님")
    })
    ResponseEntity<BaseResponse<CancellationOfferDetailResponse>> getCancellationDetail(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1") @UserId Long userId,
            @Parameter(description = "취소표 제안 ID") Long cancellationId
    );

    @Operation(summary = "취소표 구매 확정", description = "1시간 타이머 내에 취소표를 구매 확정합니다. 무통장 입금 또는 카카오페이를 선택할 수 있습니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "구매 확정 성공"),
            @ApiResponse(responseCode = "409", description = "유효한 구매 가능 시간이 지났거나 상태 오류")
    })
    ResponseEntity<BaseResponse<CancellationPurchaseResponse>> purchaseCancellation(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1") @UserId Long userId,
            @Parameter(description = "취소표 제안 ID") Long cancellationId,
            @RequestBody(description = "구매 요청 정보") CancellationPurchaseRequest request
    );

    @Operation(summary = "취소표 알림 발송 (내부 시스템 전용)", description = "내부 스케줄러가 호출하여 1순위 후보자에게 문자 알림을 발송하고 1시간 카운트다운을 시작합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "문자 발송 요청 성공")
    })
    ResponseEntity<BaseResponse<Void>> notifyCandidate(
            @Parameter(description = "내부 보안 키", required = true) String internalSecret,
            @Parameter(description = "취소표 제안 ID") Long cancellationId
    );
}
