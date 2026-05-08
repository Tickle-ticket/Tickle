package com.ssafy.tickle.payment.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.payment.domain.PaymentErrorCode;
import com.ssafy.tickle.payment.presentation.dto.PaymentMethodSelectionRequest;
import com.ssafy.tickle.payment.presentation.dto.PaymentMethodSelectionResponse;
import com.ssafy.tickle.reservation.domain.Booking;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 예매 초안에 대한 결제 수단 선택만 처리하는 서비스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentMethodSelectionService {

    private final BookingRepository bookingRepository;

    /**
     * 권종 선택까지 완료된 예매 초안에 대해 결제 수단 선택 가능 여부를 검증하고 다음 액션을 반환합니다.
     *
     * <p>이 메서드는 결제 수단 선택만 책임집니다.
     * 실제 무통장 입금 준비나 카카오페이 ready 호출은 별도 API가 처리합니다.</p>
     *
     * @param eventId 공연 식별자
     * @param scheduleId 회차 식별자
     * @param userId 사용자 식별자
     * @param request 결제 수단 선택 요청
     * @return 선택된 결제 수단과 FE의 다음 액션
     */
    @Transactional
    public PaymentMethodSelectionResponse selectMethod(
            Long eventId,
            Long scheduleId,
            Long userId,
            PaymentMethodSelectionRequest request
    ) {
        Booking booking = bookingRepository.findById(request.bookingId())
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "예매 초안을 찾을 수 없습니다."));

        validateBookingOwnership(booking, eventId, scheduleId, userId);

        // 결제 수단 선택 API는 예매 초안 검증 후, FE가 어떤 준비 API를 호출해야 하는지만 알려준다.
        return switch (request.paymentMethod()) {
            case BANK_TRANSFER -> PaymentMethodSelectionResponse.forBankTransfer(booking.getId());
            case KAKAOPAY -> PaymentMethodSelectionResponse.forKakaoPay(booking.getId());
            default -> throw new BaseException(PaymentErrorCode.PAYMENT_METHOD_NOT_SUPPORTED);
        };
    }

    /**
     * 선택 대상 예매 초안이 현재 사용자와 공연/회차에 속한 유효한 초안인지 검증합니다.
     *
     * @param booking 검증 대상 예매 초안
     * @param eventId 공연 식별자
     * @param scheduleId 회차 식별자
     * @param userId 사용자 식별자
     */
    private void validateBookingOwnership(Booking booking, Long eventId, Long scheduleId, Long userId) {
        if (!booking.getUser().getId().equals(userId)
                || !booking.getSession().getId().equals(scheduleId)
                || !booking.getSession().getEvent().getId().equals(eventId)) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "예매 초안과 사용자/공연/회차 정보가 일치하지 않습니다.");
        }

        // 결제 수단 선택은 권종 선택까지 끝난 DRAFT 예매 초안에 대해서만 허용한다.
        if (booking.getBookingStatus() != Booking.Status.DRAFT) {
            throw new BaseException(PaymentErrorCode.PAYMENT_INVALID_STATE);
        }
    }
}
