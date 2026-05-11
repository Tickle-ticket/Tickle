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
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

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

    // 결제 트랜잭션 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_transaction_id", nullable = false, updatable = false)
    private Long id;

    // 결제 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    // 타입
    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 30, columnDefinition = "varchar(30)")
    private TransactionType transactionType;

    // 상태
    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_status", nullable = false, length = 30, columnDefinition = "varchar(30)")
    private TransactionStatus transactionStatus;

    // 금액
    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    // 통화
    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    // PG사
    @Column(name = "provider_name", nullable = false, length = 50)
    private String providerName;

    // PG 거래 ID
    @Column(name = "provider_transaction_id", length = 255)
    private String providerTransactionId;

    // 승인번호
    @Column(name = "provider_approval_no", length = 100)
    private String providerApprovalNo;

    // 이벤트 ID
    @Column(name = "provider_event_id", length = 255)
    private String providerEventId;

    // 요청 ID
    @Column(name = "request_id", length = 200)
    private String requestId;

    // 멱등키
    @Column(name = "idempotency_key", length = 255)
    private String idempotencyKey;

    // 발생 시각
    @Column(name = "transacted_at", nullable = false)
    private Instant transactedAt;

    // 처리 시각
    @Column(name = "processed_at")
    private Instant processedAt;

    // 실패 코드
    @Column(name = "failure_code", length = 100)
    private String failureCode;

    // 실패 메시지
    @Column(name = "failure_message", length = 255)
    private String failureMessage;

    // 원본 응답
    @Lob
    @Column(name = "raw_response_json")
    private String rawResponseJson;

    // 생성 시각
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
        this.createdAt = Instant.now();
    }

    /**
     * 무통장 입금 대기 생성 이력을 남깁니다.
     *
     * @param payment 대상 결제
     * @param requestId 요청 식별자
     * @return 생성된 거래 이력
     */
    public static PaymentTransaction pendingSale(Payment payment, String requestId) {
        return PaymentTransaction.builder()
                .payment(payment)
                .transactionType(TransactionType.SALE)
                .transactionStatus(TransactionStatus.PENDING)
                .amount(payment.getOrderAmount())
                .currencyCode(payment.getCurrencyCode())
                .providerName(payment.getProviderName())
                .requestId(requestId)
                .transactedAt(Instant.now())
                .build();
    }

    /**
     * 카카오페이 ready 요청 이력을 남깁니다.
     *
     * @param payment 대상 결제
     * @param requestId 요청 식별자
     * @param providerTransactionId 카카오페이 tid
     * @return 생성된 거래 이력
     */
    public static PaymentTransaction requestedReady(
            Payment payment,
            String requestId,
            String providerTransactionId
    ) {
        return PaymentTransaction.builder()
                .payment(payment)
                .transactionType(TransactionType.AUTH)
                .transactionStatus(TransactionStatus.REQUESTED)
                .amount(payment.getOrderAmount())
                .currencyCode(payment.getCurrencyCode())
                .providerName(payment.getProviderName())
                .providerTransactionId(providerTransactionId)
                .requestId(requestId)
                .transactedAt(Instant.now())
                .build();
    }

    /**
     * 무통장 입금 승인 이력을 남깁니다.
     *
     * @param payment 대상 결제
     * @param providerEventId 외부 이벤트 식별자
     * @return 생성된 거래 이력
     */
    public static PaymentTransaction succeededSale(Payment payment, String providerEventId) {
        Instant now = Instant.now();
        return PaymentTransaction.builder()
                .payment(payment)
                .transactionType(TransactionType.SALE)
                .transactionStatus(TransactionStatus.SUCCEEDED)
                .amount(payment.getOrderAmount())
                .currencyCode(payment.getCurrencyCode())
                .providerName(payment.getProviderName())
                .providerEventId(providerEventId)
                .transactedAt(now)
                .processedAt(now)
                .build();
    }

    /**
     * 무통장 입금 만료 이력을 남깁니다.
     *
     * @param payment 대상 결제
     * @param failureCode 실패 코드
     * @param failureMessage 실패 메시지
     * @return 생성된 거래 이력
     */
    public static PaymentTransaction expiredCancel(
            Payment payment,
            String failureCode,
            String failureMessage
    ) {
        Instant now = Instant.now();
        return PaymentTransaction.builder()
                .payment(payment)
                .transactionType(TransactionType.CANCEL)
                .transactionStatus(TransactionStatus.SUCCEEDED)
                .amount(payment.getOrderAmount())
                .currencyCode(payment.getCurrencyCode())
                .providerName(payment.getProviderName())
                .transactedAt(now)
                .processedAt(now)
                .failureCode(failureCode)
                .failureMessage(failureMessage)
                .build();
    }

    /**
     * 카카오페이 승인 성공 이력을 남깁니다.
     *
     * @param payment 대상 결제
     * @param providerTransactionId 카카오페이 tid
     * @param providerApprovalNo 카카오페이 승인번호
     * @param rawResponseJson 카카오페이 원본 응답
     * @return 생성된 거래 이력
     */
    public static PaymentTransaction succeededApprove(
            Payment payment,
            String providerTransactionId,
            String providerApprovalNo,
            String rawResponseJson
    ) {
        Instant now = Instant.now();
        return PaymentTransaction.builder()
                .payment(payment)
                .transactionType(TransactionType.SALE)
                .transactionStatus(TransactionStatus.SUCCEEDED)
                .amount(payment.getOrderAmount())
                .currencyCode(payment.getCurrencyCode())
                .providerName(payment.getProviderName())
                .providerTransactionId(providerTransactionId)
                .providerApprovalNo(providerApprovalNo)
                .rawResponseJson(rawResponseJson)
                .transactedAt(now)
                .processedAt(now)
                .build();
    }

    /**
     * 카카오페이 결제 실패 이력을 남깁니다.
     *
     * @param payment 대상 결제
     * @param failureCode 실패 코드
     * @param failureMessage 실패 메시지
     * @return 생성된 거래 이력
     */
    public static PaymentTransaction failedSale(
            Payment payment,
            String failureCode,
            String failureMessage
    ) {
        Instant now = Instant.now();
        return PaymentTransaction.builder()
                .payment(payment)
                .transactionType(TransactionType.SALE)
                .transactionStatus(TransactionStatus.FAILED)
                .amount(payment.getOrderAmount())
                .currencyCode(payment.getCurrencyCode())
                .providerName(payment.getProviderName())
                .transactedAt(now)
                .processedAt(now)
                .failureCode(failureCode)
                .failureMessage(failureMessage)
                .build();
    }

    /**
     * 카카오페이 사용자 취소 이력을 남깁니다.
     *
     * @param payment 대상 결제
     * @param failureMessage 취소 메시지
     * @return 생성된 거래 이력
     */
    public static PaymentTransaction cancelledSale(
            Payment payment,
            String failureMessage
    ) {
        Instant now = Instant.now();
        return PaymentTransaction.builder()
                .payment(payment)
                .transactionType(TransactionType.CANCEL)
                .transactionStatus(TransactionStatus.SUCCEEDED)
                .amount(payment.getOrderAmount())
                .currencyCode(payment.getCurrencyCode())
                .providerName(payment.getProviderName())
                .transactedAt(now)
                .processedAt(now)
                .failureCode("USER_CANCELLED")
                .failureMessage(failureMessage)
                .build();
    }
}
