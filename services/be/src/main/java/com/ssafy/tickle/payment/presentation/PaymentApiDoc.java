package com.ssafy.tickle.payment.presentation;

import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.payment.presentation.dto.BankTransferPrepareRequest;
import com.ssafy.tickle.payment.presentation.dto.BankTransferPrepareResponse;
import com.ssafy.tickle.payment.presentation.dto.KakaoPayReadyRequest;
import com.ssafy.tickle.payment.presentation.dto.KakaoPayReadyResponse;
import com.ssafy.tickle.payment.presentation.dto.PaymentMethodSelectionRequest;
import com.ssafy.tickle.payment.presentation.dto.PaymentMethodSelectionResponse;
import com.ssafy.tickle.payment.presentation.dto.PaymentStatusResponse;
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
 * 결제 API Swagger 문서 인터페이스입니다.
 */
@Tag(name = "Payment", description = "결제 API")
public interface PaymentApiDoc {

    @Operation(
            summary = "결제 수단 선택",
            description = """
                    권종 선택까지 완료된 예매 초안에 대해 결제 수단 선택 가능 여부를 검증하고,
                    FE가 이어서 호출해야 할 다음 준비 액션을 반환합니다.

                    - `BANK_TRANSFER`를 선택하면 `PREPARE_BANK_TRANSFER`를 반환합니다.
                    - `KAKAOPAY`를 선택하면 `PREPARE_KAKAOPAY`를 반환합니다.
                    - 실제 무통장 입금 준비나 카카오페이 ready 호출은 별도 API가 담당합니다.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "결제 수단 선택 성공"),
            @ApiResponse(responseCode = "400", description = "지원하지 않는 결제 수단"),
            @ApiResponse(responseCode = "404", description = "예매 초안 또는 회차를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "현재 예매 상태에서는 해당 결제 수단을 선택할 수 없음")
    })
    ResponseEntity<BaseResponse<PaymentMethodSelectionResponse>> selectPaymentMethod(
            @Parameter(description = "공연 식별자", required = true, example = "1")
            @PathVariable Long eventId,
            @Parameter(description = "회차 식별자", required = true, example = "1")
            @PathVariable Long scheduleId,
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1")
            @UserId Long userId,
            @Valid @RequestBody PaymentMethodSelectionRequest request
    );

    @Operation(
            summary = "무통장 입금 결제 확정 및 입금 안내 조회",
            description = """
                    좌석 hold 성공 후 결제 수단을 무통장 입금으로 확정하고 입금 안내 정보를 반환합니다.

                    - Redis hold 키와 DB HELD 상태를 함께 검증합니다.
                    - 예매 초안(`DRAFT`)을 `PENDING_PAYMENT`로 전환합니다.
                    - 성공 시 Payment를 생성하고 BookingTicket도 `PENDING_PAYMENT`로 전환합니다.
                    - 좌석은 HELD -> PENDING 상태로 전환됩니다.
                    - 결제 금액은 `booking/preorder`에서 확정된 booking 총액을 사용합니다.
                    - 응답으로 입금 계좌와 입금 마감 시각을 반환합니다.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "무통장 입금 확정 및 안내 조회 성공"),
            @ApiResponse(responseCode = "404", description = "좌석 hold 또는 사용자/회차를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "이미 처리된 결제 또는 유효하지 않은 결제 상태")
    })
    ResponseEntity<BaseResponse<BankTransferPrepareResponse>> confirmBankTransferPayment(
            @Parameter(description = "공연 식별자", required = true, example = "1")
            @PathVariable Long eventId,
            @Parameter(description = "회차 식별자", required = true, example = "1")
            @PathVariable Long scheduleId,
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1")
            @UserId Long userId,
            @Valid @RequestBody BankTransferPrepareRequest request
    );

    @Operation(
            summary = "카카오페이 단건 결제 준비",
            description = """
                    좌석 hold와 예매 초안이 준비된 상태에서 카카오페이 ready API를 호출합니다.

                    - `partner_order_id`는 내부 `paymentId`를 사용합니다.
                    - `partner_user_id`는 내부 `userId`를 사용합니다.
                    - `item_name`은 공연 이름을 사용합니다.
                    - `quantity`는 결제 시도 티켓 수를 사용합니다.
                    - `total_amount`는 총 결제 금액을 사용합니다.
                    - `vat_amount`는 총 수수료 금액을 사용합니다.
                    - `tax_free_amount`는 0으로 고정합니다.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "카카오페이 결제 준비 성공"),
            @ApiResponse(responseCode = "404", description = "예매 초안 또는 회차를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "유효하지 않은 예매 상태")
    })
    ResponseEntity<BaseResponse<KakaoPayReadyResponse>> readyKakaoPay(
            @Parameter(description = "공연 식별자", required = true, example = "1")
            @PathVariable Long eventId,
            @Parameter(description = "회차 식별자", required = true, example = "1")
            @PathVariable Long scheduleId,
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1")
            @UserId Long userId,
            @Valid @RequestBody KakaoPayReadyRequest request
    );

    @Operation(
            summary = "카카오페이 승인 성공 콜백",
            description = """
                    카카오페이 결제 성공 후 `pg_token`을 받아 approve API를 호출하고,
                    결제와 예매를 최종 확정한 뒤 FE 예매 확정 페이지로 리다이렉트합니다.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "302", description = "승인 성공 후 예매 확정 페이지로 리다이렉트"),
            @ApiResponse(responseCode = "404", description = "결제 정보를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "현재 결제 상태에서는 승인 처리를 할 수 없음")
    })
    ResponseEntity<Void> approveKakaoPay(
            @Parameter(description = "내부 결제 식별자", required = true, example = "1")
            @RequestParam Long paymentId,
            @Parameter(description = "카카오페이 승인 토큰", required = true, example = "abcdefg")
            @RequestParam("pg_token") String pgToken
    );

    @Operation(
            summary = "카카오페이 실패 콜백",
            description = """
                    카카오페이 결제 실패 후 호출되는 콜백입니다.
                    결제 시도만 실패 상태로 남기고, 예매 초안과 좌석 선점은 유지한 채 결제 수단 선택 페이지로 리다이렉트합니다.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "302", description = "결제 수단 선택 페이지로 리다이렉트"),
            @ApiResponse(responseCode = "404", description = "결제 정보를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "현재 결제 상태에서는 실패 처리를 할 수 없음")
    })
    ResponseEntity<Void> failKakaoPay(
            @Parameter(description = "내부 결제 식별자", required = true, example = "1")
            @RequestParam Long paymentId
    );

    @Operation(
            summary = "카카오페이 취소 콜백",
            description = """
                    사용자가 카카오페이 결제를 취소했을 때 호출되는 콜백입니다.
                    결제만 취소 상태로 남기고, 예매 초안과 좌석 선점은 유지한 채 결제 수단 선택 페이지로 리다이렉트합니다.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "302", description = "결제 수단 선택 페이지로 리다이렉트"),
            @ApiResponse(responseCode = "404", description = "결제 정보를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "현재 결제 상태에서는 취소 처리를 할 수 없음")
    })
    ResponseEntity<Void> cancelKakaoPay(
            @Parameter(description = "내부 결제 식별자", required = true, example = "1")
            @RequestParam Long paymentId
    );

    @Operation(summary = "결제 상태 조회")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "결제 상태 조회 성공"),
            @ApiResponse(responseCode = "403", description = "접근 권한 없음 (타인 결제)"),
            @ApiResponse(responseCode = "404", description = "결제 정보를 찾을 수 없음")
    })
    ResponseEntity<BaseResponse<PaymentStatusResponse>> getPaymentStatus(
            @Parameter(description = "결제 식별자", required = true, example = "1")
            @PathVariable Long paymentId,
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1")
            @UserId Long userId
    );
}
