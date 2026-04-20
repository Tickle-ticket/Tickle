package com.ssafy.tickle.event.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * 이벤트의 가격 등급과 판매 금액 정책을 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "event_price_policies")
public class EventPricePolicy {

    // 가격 정책 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_price_policy_id", nullable = false, updatable = false)
    private Long id;

    // 공연 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    // 가격 등급
    @Column(name = "price_grade", nullable = false, length = 30)
    private String priceGrade;

    // 판매가
    @Column(name = "sale_price_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal salePriceAmount;

    // 통화
    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    // 정렬순서
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    // 생성 시각
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // 수정 시각
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * 이벤트 가격 정책 엔티티를 생성합니다.
     *
     * @param event 대상 이벤트
     * @param priceGrade 가격 등급
     * @param salePriceAmount 판매 금액
     * @param currencyCode 통화 코드
     * @param displayOrder 노출 순서
     */
    @Builder
    public EventPricePolicy(
            Event event,
            String priceGrade,
            BigDecimal salePriceAmount,
            String currencyCode,
            Integer displayOrder
    ) {
        this.event = event;
        this.priceGrade = priceGrade;
        this.salePriceAmount = salePriceAmount;
        this.currencyCode = currencyCode;
        this.displayOrder = displayOrder;
    }
}
