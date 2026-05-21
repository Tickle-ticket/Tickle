package com.ssafy.tickle.payment.domain;

import com.ssafy.tickle.reservation.domain.Booking;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.math.BigDecimal;
import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

/**
 * 예매 건에 대한 결제 정보를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "payments")
public class Payment {

    // 결제 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_id", nullable = false, updatable = false)
    private Long id;

    // 예매 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    // 상태
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, columnDefinition = "varchar(30)")
    private Status paymentStatus;

    // 결제 수단
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method_type", nullable = false, columnDefinition = "varchar(50)")
    private MethodType paymentMethodType;

    // 금액
    @Column(name = "order_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal orderAmount;

    // 통화
    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    // 승인 금액
    @Column(name = "approved_amount", precision = 18, scale = 2)
    private BigDecimal approvedAmount;

    // PG사
    @Column(name = "provider_name", nullable = false, length = 50)
    private String providerName;

    // 현재 활성 PG 거래 ID
    @Column(name = "provider_transaction_id", length = 255)
    private String providerTransactionId;

    // 승인 시각
    @Column(name = "approved_at")
    private Instant approvedAt;

    // 실패 시각
    @Column(name = "failed_at")
    private Instant failedAt;

    // 생성 시각
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // 변경 시각
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum Status {
        READY,
        PENDING,
        APPROVED,
        FAILED,
        CANCELLED,
        PARTIAL_REFUNDED,
        REFUNDED
    }

    public enum MethodType {
        BANK_TRANSFER,
        KAKAOPAY
    }

    /**
     * 결제 엔티티를 생성합니다.
     *
     * @param booking 결제가 연결된 예매
     * @param paymentStatus 결제 상태
     * @param paymentMethodType 결제 수단 유형
     * @param orderAmount 주문 금액
     * @param currencyCode 통화 코드
     * @param approvedAmount 승인 금액
     * @param providerName 결제 제공사명
     * @param approvedAt 승인 시각
     * @param failedAt 실패 시각
     */
    @Builder
    public Payment(
            Booking booking,
            Status paymentStatus,
            MethodType paymentMethodType,
            BigDecimal orderAmount,
            String currencyCode,
            BigDecimal approvedAmount,
            String providerName,
            Instant approvedAt,
            Instant failedAt
    ) {
        this.booking = booking;
        this.paymentStatus = paymentStatus;
        this.paymentMethodType = paymentMethodType;
        this.orderAmount = orderAmount;
        this.currencyCode = currencyCode;
        this.approvedAmount = approvedAmount;
        this.providerName = providerName;
        this.approvedAt = approvedAt;
        this.failedAt = failedAt;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    /**
     * 무통장 입금 대기 결제를 생성합니다.
     *
     * @param booking 연결 예매
     * @param orderAmount 주문 금액
     * @param currencyCode 통화 코드
     * @param providerName 제공사명
     * @return 생성된 결제 엔티티
     */
    public static Payment pendingBankTransfer(
            Booking booking,
            BigDecimal orderAmount,
            String currencyCode,
            String providerName
    ) {
        return Payment.builder()
                .booking(booking)
                .paymentStatus(Status.PENDING)
                .paymentMethodType(MethodType.BANK_TRANSFER)
                .orderAmount(orderAmount)
                .currencyCode(currencyCode)
                .providerName(providerName)
                .build();
    }

    /**
     * 카카오페이 결제 준비 상태 결제를 생성합니다.
     *
     * @param booking 연결 예매
     * @param orderAmount 주문 금액
     * @param currencyCode 통화 코드
     * @param providerName 제공사명
     * @return 생성된 결제 엔티티
     */
    public static Payment readyKakaoPay(
            Booking booking,
            BigDecimal orderAmount,
            String currencyCode,
            String providerName
    ) {
        return Payment.builder()
                .booking(booking)
                .paymentStatus(Status.READY)
                .paymentMethodType(MethodType.KAKAOPAY)
                .orderAmount(orderAmount)
                .currencyCode(currencyCode)
                .providerName(providerName)
                .build();
    }

    /**
     * 결제를 승인 상태로 전환합니다.
     *
     * @param approvedAmount 승인 금액
     */
    public void approve(BigDecimal approvedAmount) {
        this.paymentStatus = Status.APPROVED;
        this.approvedAmount = approvedAmount;
        this.approvedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    /**
     * 현재 결제에 연결된 외부 PG 거래 ID를 기록합니다.
     *
     * <p>ready와 approve가 분리된 결제수단은 이후 승인/취소 요청에서
     * 같은 외부 거래 ID를 다시 사용해야 하므로 Payment 수준에서도 보관합니다.</p>
     *
     * @param providerTransactionId 외부 PG 거래 ID
     */
    public void recordProviderTransactionId(String providerTransactionId) {
        this.providerTransactionId = providerTransactionId;
        this.updatedAt = Instant.now();
    }

    /**
     * 결제를 취소 상태로 전환합니다.
     */
    public void cancel() {
        this.paymentStatus = Status.CANCELLED;
        this.updatedAt = Instant.now();
    }

    /**
     * 결제를 실패 상태로 전환합니다.
     */
    public void fail() {
        this.paymentStatus = Status.FAILED;
        this.failedAt = Instant.now();
        this.updatedAt = Instant.now();
    }
}
