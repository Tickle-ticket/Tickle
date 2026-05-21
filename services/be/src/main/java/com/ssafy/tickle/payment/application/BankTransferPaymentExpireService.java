package com.ssafy.tickle.payment.application;

import com.ssafy.tickle.payment.config.PaymentConstants;
import com.ssafy.tickle.payment.domain.Payment;
import com.ssafy.tickle.payment.infrastructure.persistence.PaymentRepository;
import com.ssafy.tickle.reservation.domain.Booking;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.List;

/**
 * 무통장 입금 만료 배치를 처리합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BankTransferPaymentExpireService {

    private final PaymentRepository paymentRepository;
    private final BankTransferPaymentService bankTransferPaymentService;

    /**
     * DB에 저장된 pending 무통장 입금 결제 중 만료된 건을 정리합니다.
     *
     * <p>대량 결제 건도 한 번에 모두 읽지 않도록 payment ID 커서 기준으로
     * 배치 조회한 뒤, 실제 상태 전이는 명령 서비스에 위임합니다.</p>
     *
     * @return 처리 건수
     */
    @Transactional
    public Integer expirePendingBankTransferPayments() {
        Integer expiredCount = 0;
        Long paymentIdCursor = 0L;
        Instant expiredPaymentCreatedBefore = getExpiredPaymentCreatedBefore(Instant.now());

        while (true) {
            // 하루 1회 배치여도 건수가 많을 수 있으니 ID 커서 기준으로 잘라 읽는다.
            List<Payment> payments = paymentRepository.findExpiredPendingBankTransferBatch(
                    Payment.Status.PENDING,
                    Payment.MethodType.BANK_TRANSFER,
                    Booking.Status.PENDING_PAYMENT,
                    expiredPaymentCreatedBefore,
                    paymentIdCursor,
                    PageRequest.of(0, PaymentConstants.BANK_TRANSFER_EXPIRE_BATCH_SIZE)
            );

            if (payments.isEmpty()) {
                break;
            }

            for (Payment payment : payments) {
                // 배치 후보를 뽑은 뒤에도 개별 건은 명령 서비스에서 상태를 다시 검증한다.
                if (bankTransferPaymentService.expirePendingBankTransferPayment(payment.getId())) {
                    expiredCount++;
                }
                paymentIdCursor = payment.getId();
            }
        }

        return expiredCount;
    }

    /**
     * 하루 1회 배치 시점에 이미 만료되어 있어야 하는 결제의 생성 시각 상한을 계산합니다.
     *
     * @param now 기준 시각
     * @return 만료 대상 결제 생성 시각 상한
     */
    private Instant getExpiredPaymentCreatedBefore(Instant now) {
        ZonedDateTime zonedNow = now.atZone(PaymentConstants.PAYMENT_DEADLINE_ZONE_ID);
        return zonedNow.toLocalDate()
                .minusDays(1)
                .atStartOfDay(PaymentConstants.PAYMENT_DEADLINE_ZONE_ID)
                .toInstant();
    }
}
