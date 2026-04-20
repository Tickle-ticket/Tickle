package com.ssafy.tickle.payment.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

/**
 * 결제 요청과 결과 이력을 관리하는 거래 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "payment_transactions")
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_transaction_id", nullable = false, updatable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 30)
    private TransactionType transactionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_status", nullable = false, length = 30)
    private TransactionStatus transactionStatus;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "provider_name", nullable = false, length = 50)
    private String providerName;

    @Column(name = "provider_transaction_id", length = 255)
    private String providerTransactionId;

    @Column(name = "provider_approval_no", length = 100)
    private String providerApprovalNo;

    @Column(name = "provider_event_id", length = 255)
    private String providerEventId;

    @Column(name = "request_id", length = 200)
    private String requestId;

    @Column(name = "idempotency_key", length = 255)
    private String idempotencyKey;

    @Column(name = "transacted_at", nullable = false)
    private Instant transactedAt;

    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "failure_code", length = 100)
    private String failureCode;

    @Column(name = "failure_message", length = 255)
    private String failureMessage;

    @Lob
    @Column(name = "raw_response_json")
    private String rawResponseJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public enum TransactionType {
        AUTH,
        CAPTURE,
        SALE,
        REFUND,
        CANCEL,
        VOID
    }

    public enum TransactionStatus {
        REQUESTED,
        PENDING,
        SUCCEEDED,
        FAILED
    }

    /**
     * 결제 거래 엔티티를 생성합니다.
     *
     * @param payment 결제가 연결된 거래
     * @param transactionType 거래 유형
     * @param transactionStatus 거래 상태
     * @param amount 거래 금액
     * @param currencyCode 통화 코드
     * @param providerName 결제 제공사명
     * @param providerTransactionId 제공사 거래 식별자
     * @param providerApprovalNo 제공사 승인 번호
     * @param providerEventId 제공사 이벤트 식별자
     * @param requestId 요청 식별자
     * @param idempotencyKey 멱등 키
     * @param transactedAt 거래 발생 시각
     * @param processedAt 처리 완료 시각
     * @param failureCode 실패 코드
     * @param failureMessage 실패 메시지
     * @param rawResponseJson 원본 응답 JSON
     */
    @Builder
    public PaymentTransaction(
            Payment payment,
            TransactionType transactionType,
            TransactionStatus transactionStatus,
            BigDecimal amount,
            String currencyCode,
            String providerName,
            String providerTransactionId,
            String providerApprovalNo,
            String providerEventId,
            String requestId,
            String idempotencyKey,
            Instant transactedAt,
            Instant processedAt,
            String failureCode,
            String failureMessage,
            String rawResponseJson
    ) {
        this.payment = payment;
        this.transactionType = transactionType;
        this.transactionStatus = transactionStatus;
        this.amount = amount;
        this.currencyCode = currencyCode;
        this.providerName = providerName;
        this.providerTransactionId = providerTransactionId;
        this.providerApprovalNo = providerApprovalNo;
        this.providerEventId = providerEventId;
        this.requestId = requestId;
        this.idempotencyKey = idempotencyKey;
        this.transactedAt = transactedAt;
        this.processedAt = processedAt;
        this.failureCode = failureCode;
        this.failureMessage = failureMessage;
        this.rawResponseJson = rawResponseJson;
    }
}
