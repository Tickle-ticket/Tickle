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

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_id", nullable = false, updatable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 30)
    private Status paymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method_type", nullable = false, length = 50)
    private MethodType paymentMethodType;

    @Column(name = "order_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal orderAmount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "approved_amount", precision = 18, scale = 2)
    private BigDecimal approvedAmount;

    @Column(name = "provider_name", nullable = false, length = 50)
    private String providerName;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "failed_at")
    private Instant failedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

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
        CREDIT_CARD,
        BANK_TRANSFER,
        VBANK,
        SIMPLE_PAY,
        MOBILE
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
    }
}
