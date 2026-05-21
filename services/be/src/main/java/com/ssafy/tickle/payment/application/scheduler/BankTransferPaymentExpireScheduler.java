package com.ssafy.tickle.payment.application.scheduler;

import com.ssafy.tickle.payment.application.BankTransferPaymentExpireService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 무통장 입금 만료 결제를 정리하는 스케줄러입니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BankTransferPaymentExpireScheduler {

    private final BankTransferPaymentExpireService bankTransferPaymentExpireService;

    /**
     * KST 기준 하루 1회 무통장 입금 만료 결제를 정리합니다.
     */
    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Seoul")
    public void expirePendingPayments() {
        int expiredCount = bankTransferPaymentExpireService.expirePendingBankTransferPayments();
        if (expiredCount > 0) {
            log.info("[무통장입금 만료] {}건 처리", expiredCount);
        }
    }
}
