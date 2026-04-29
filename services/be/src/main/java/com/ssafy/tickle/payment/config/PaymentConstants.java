package com.ssafy.tickle.payment.config;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.ZoneId;

/**
 * 결제 도메인 Redis 키와 정책 상수를 관리합니다.
 */
public final class PaymentConstants {

    // 은행사
    public static final String BANK_TRANSFER_PROVIDER = "INTERNAL_BANK_TRANSFER";

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

    // 무통장입금 유저 키
    public static final String BANK_TRANSFER_USER_KEY_PREFIX = "payment:bank-transfer:user:";

    // 무통장입금 유저 만료일 ZSet 키
    public static final String BANK_TRANSFER_DEADLINE_ZSET_KEY = "payment:bank-transfer:deadline";

    // 만료 처리 배치 사이즈
    public static final long EXPIRE_BATCH_SIZE = 100L;

    private PaymentConstants() {
    }
}
