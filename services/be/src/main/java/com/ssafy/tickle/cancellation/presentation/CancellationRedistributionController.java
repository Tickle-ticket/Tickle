package com.ssafy.tickle.cancellation.presentation;

import com.ssafy.tickle.cancellation.application.CancellationRedistributionService;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationOfferDetailResponse;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationPurchaseRequest;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationPurchaseResponse;
import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/cancellations")
public class CancellationRedistributionController implements CancellationRedistributionApiDoc {

    private final CancellationRedistributionService cancellationRedistributionService;

    @Override
    @GetMapping("/{cancellationId}")
    public ResponseEntity<BaseResponse<CancellationOfferDetailResponse>> getCancellationDetail(
            @UserId Long userId,
            @PathVariable Long cancellationId
    ) {
        CancellationOfferDetailResponse response = cancellationRedistributionService.getCancellationDetail(cancellationId, userId);
        return ResponseEntity.ok().body(BaseResponse.success(response));
    }

    @Override
    @PostMapping("/{cancellationId}/purchase")
    public ResponseEntity<BaseResponse<CancellationPurchaseResponse>> purchaseCancellation(
            @UserId Long userId,
            @PathVariable Long cancellationId,
            @RequestBody CancellationPurchaseRequest request
    ) {
        CancellationPurchaseResponse response = cancellationRedistributionService.purchaseCancellation(cancellationId, userId, request);
        return ResponseEntity.ok().body(BaseResponse.success(response));
    }

    @Override
    @PostMapping("/{cancellationId}/notify")
    public ResponseEntity<BaseResponse<Void>> notifyCandidate(
            @RequestHeader(value = "X-Internal-Secret", required = false) String internalSecret,
            @PathVariable Long cancellationId
    ) {
        // Internal Secret Header 검증은 인터셉터나 시큐리티 등에서 처리될 수 있으나
        // 내부 API임을 명시적으로 처리하기 위해 추가적인 로직을 수행할 수 있습니다.
        cancellationRedistributionService.notifyCandidate(cancellationId);
        return ResponseEntity.ok().body(BaseResponse.success(SuccessCode.OK, null));
    }
}
