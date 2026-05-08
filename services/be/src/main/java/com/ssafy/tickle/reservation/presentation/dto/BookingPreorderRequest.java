package com.ssafy.tickle.reservation.presentation.dto;

import com.ssafy.tickle.payment.presentation.dto.PaymentOptionSelectionRequest;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * 좌석과 권종/할인을 먼저 확정하고 예매 초안을 생성하는 요청 DTO입니다.
 *
 * <p>이 요청은 아직 결제 완료가 아니라, 사용자가 어떤 좌석을 어떤 가격으로
 * 살지 결정한 뒤 초안을 저장하는 단계에서 사용한다.</p>
 *
 * @param eventId 공연 식별자
 * @param sessionId 회차 식별자
 * @param sessionSeatIds 초안에 포함할 회차 좌석 ID 목록
 * @param optionSelections 좌석별 선택 권종/할인 정보
 */
public record BookingPreorderRequest(
        @NotNull(message = "eventId는 필수입니다.")
        Long eventId,
        @NotNull(message = "sessionId는 필수입니다.")
        Long sessionId,
        @NotEmpty(message = "sessionSeatIds는 최소 1개 이상이어야 합니다.")
        List<Long> sessionSeatIds,
        @NotEmpty(message = "optionSelections는 최소 1개 이상이어야 합니다.")
        List<PaymentOptionSelectionRequest> optionSelections
) {
}
