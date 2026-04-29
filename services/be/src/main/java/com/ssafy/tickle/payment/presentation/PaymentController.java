package com.ssafy.tickle.payment.presentation;

import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.payment.application.PaymentService;
import com.ssafy.tickle.payment.presentation.dto.BankTransferPrepareRequest;
import com.ssafy.tickle.payment.presentation.dto.BankTransferPrepareResponse;
import com.ssafy.tickle.payment.presentation.dto.PaymentStatusResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 결제 API를 제공하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Payment", description = "결제 API")
public class PaymentController implements PaymentApiDoc {

    private final PaymentService paymentService;

    @Override
    @PostMapping("/events/{eventId}/schedules/{scheduleId}/payments/bank-transfer")
    public ResponseEntity<BaseResponse<BankTransferPrepareResponse>> confirmBankTransferPayment(
            @PathVariable Long eventId,
            @PathVariable Long scheduleId,
            @RequestParam Long userId,
            @Valid @RequestBody BankTransferPrepareRequest request
    ) {
        return ResponseEntity.ok(
                BaseResponse.success(
                        SuccessCode.OK,
                        paymentService.confirmBankTransferPayment(eventId, scheduleId, userId, request)
                )
        );
    }

    @Override
    @GetMapping("/payments/{paymentId}")
    public ResponseEntity<BaseResponse<PaymentStatusResponse>> getPaymentStatus(@PathVariable Long paymentId) {
        return ResponseEntity.ok(
                BaseResponse.success(SuccessCode.OK, paymentService.getPaymentStatus(paymentId))
        );
    }
}
