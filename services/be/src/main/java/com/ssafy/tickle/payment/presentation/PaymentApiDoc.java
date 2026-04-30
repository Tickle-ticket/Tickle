package com.ssafy.tickle.payment.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.payment.presentation.dto.BankTransferPrepareRequest;
import com.ssafy.tickle.payment.presentation.dto.BankTransferPrepareResponse;
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
            @Parameter(description = "사용자 식별자", required = true, example = "1")
            @RequestParam Long userId,
            @Valid @RequestBody BankTransferPrepareRequest request
    );

    @Operation(summary = "결제 상태 조회")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "결제 상태 조회 성공"),
            @ApiResponse(responseCode = "404", description = "결제 정보를 찾을 수 없음")
    })
    ResponseEntity<BaseResponse<PaymentStatusResponse>> getPaymentStatus(
            @Parameter(description = "결제 식별자", required = true, example = "1")
            @PathVariable Long paymentId
    );
}
