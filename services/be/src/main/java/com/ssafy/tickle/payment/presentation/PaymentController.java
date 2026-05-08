package com.ssafy.tickle.payment.presentation;

import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.payment.application.BankTransferPaymentService;
import com.ssafy.tickle.payment.application.KakaoPayPaymentService;
import com.ssafy.tickle.payment.application.PaymentMethodSelectionService;
import com.ssafy.tickle.payment.application.PaymentQueryService;
import com.ssafy.tickle.payment.presentation.dto.BankTransferPrepareRequest;
import com.ssafy.tickle.payment.presentation.dto.BankTransferPrepareResponse;
import com.ssafy.tickle.payment.presentation.dto.KakaoPayReadyRequest;
import com.ssafy.tickle.payment.presentation.dto.KakaoPayReadyResponse;
import com.ssafy.tickle.payment.presentation.dto.PaymentMethodSelectionRequest;
import com.ssafy.tickle.payment.presentation.dto.PaymentMethodSelectionResponse;
import com.ssafy.tickle.payment.presentation.dto.PaymentStatusResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
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

    private final BankTransferPaymentService bankTransferPaymentService;
    private final KakaoPayPaymentService kakaoPayPaymentService;
    private final PaymentMethodSelectionService paymentMethodSelectionService;
    private final PaymentQueryService paymentQueryService;

    @Override
    @PostMapping("/events/{eventId}/schedules/{scheduleId}/payments/select-method")
    public ResponseEntity<BaseResponse<PaymentMethodSelectionResponse>> selectPaymentMethod(
            @PathVariable Long eventId,
            @PathVariable Long scheduleId,
            @UserId Long userId,
            @Valid @RequestBody PaymentMethodSelectionRequest request
    ) {
        return ResponseEntity.ok(
                BaseResponse.success(
                        SuccessCode.OK,
                        paymentMethodSelectionService.selectMethod(eventId, scheduleId, userId, request)
                )
        );
    }

    @Override
    @PostMapping("/events/{eventId}/schedules/{scheduleId}/payments/bank-transfer")
    public ResponseEntity<BaseResponse<BankTransferPrepareResponse>> confirmBankTransferPayment(
            @PathVariable Long eventId,
            @PathVariable Long scheduleId,
            @UserId Long userId,
            @Valid @RequestBody BankTransferPrepareRequest request
    ) {
        return ResponseEntity.ok(
                BaseResponse.success(
                        SuccessCode.OK,
                        bankTransferPaymentService.confirmBankTransferPayment(eventId, scheduleId, userId, request)
                )
        );
    }

    @Override
    @PostMapping("/events/{eventId}/schedules/{scheduleId}/payments/kakaopay/ready")
    public ResponseEntity<BaseResponse<KakaoPayReadyResponse>> readyKakaoPay(
            @PathVariable Long eventId,
            @PathVariable Long scheduleId,
            @UserId Long userId,
            @Valid @RequestBody KakaoPayReadyRequest request
    ) {
        return ResponseEntity.ok(
                BaseResponse.success(
                        SuccessCode.OK,
                        kakaoPayPaymentService.readyKakaoPay(eventId, scheduleId, userId, request)
                )
        );
    }

    @Override
    @GetMapping("/payments/kakaopay/approve")
    public ResponseEntity<Void> approveKakaoPay(
            @RequestParam Long paymentId,
            @RequestParam("pg_token") String pgToken
    ) {
        // 카카오 성공 콜백은 승인 처리 완료 후 FE 완료 페이지로 즉시 리다이렉트한다.
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, kakaoPayPaymentService.approveKakaoPay(paymentId, pgToken))
                .build();
    }

    @Override
    @GetMapping("/payments/kakaopay/fail")
    public ResponseEntity<Void> failKakaoPay(@RequestParam Long paymentId) {
        // 실패 콜백은 예매 초안을 유지한 채 결제 수단 선택 화면으로 되돌린다.
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, kakaoPayPaymentService.failKakaoPay(paymentId))
                .build();
    }

    @Override
    @GetMapping("/payments/kakaopay/cancel")
    public ResponseEntity<Void> cancelKakaoPay(@RequestParam Long paymentId) {
        // 취소 콜백도 좌석 선점과 초안은 유지하고 결제 선택 화면으로 되돌린다.
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, kakaoPayPaymentService.cancelKakaoPay(paymentId))
                .build();
    }

    @Override
    @GetMapping("/payments/{paymentId}")
    public ResponseEntity<BaseResponse<PaymentStatusResponse>> getPaymentStatus(
            @PathVariable Long paymentId,
            @UserId Long userId
    ) {
        return ResponseEntity.ok(
                BaseResponse.success(SuccessCode.OK, paymentQueryService.getPaymentStatus(paymentId, userId))
        );
    }
}
