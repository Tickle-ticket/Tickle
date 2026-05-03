package com.ssafy.tickle.payment.config;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.ZoneId;

/**
 * 결제 도메인 정책 상수를 관리합니다.
 */
public final class PaymentConstants {

    // 은행사
    public static final String BANK_TRANSFER_PROVIDER = "INTERNAL_BANK_TRANSFER";

    // 카카오페이 제공사명
    public static final String KAKAOPAY_PROVIDER = "KAKAOPAY";

    // 대표 계좌번호
    public static final String BANK_TRANSFER_ACCOUNT = "110-482-129438";

    // 계좌주
    public static final String BANK_TRANSFER_ACCOUNT_HOLDER = "tickle";

    // 통화
    public static final String CURRENCY_KRW = "KRW";

    // 티켓 수수료율(5%)
    public static final BigDecimal TICKET_SERVICE_FEE_RATE = new BigDecimal("0.05");

    // 입금 만료 계산 기준 타임존
    public static final ZoneId PAYMENT_DEADLINE_ZONE_ID = ZoneId.of("Asia/Seoul");

    // 입금 마감 시각(다음날 23:59:59)
    public static final LocalTime BANK_TRANSFER_DEADLINE_TIME = LocalTime.of(23, 59, 59);

    // 만료 배치 조회 크기
    public static final int BANK_TRANSFER_EXPIRE_BATCH_SIZE = 500;

    private PaymentConstants() {
    }
}
