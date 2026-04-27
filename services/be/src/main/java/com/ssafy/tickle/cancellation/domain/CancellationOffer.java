package com.ssafy.tickle.cancellation.domain;

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

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

/**
 * 취소 대기 후보에게 발송된 좌석 제안 정보를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "cancellation_offers")
public class CancellationOffer {

    // 취소표 제안 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cancellation_offer_id", nullable = false, updatable = false)
    private Long id;

    // 취소표 대기 ID FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "cancellation_candidate_id", nullable = false)
    private CancellationCandidate cancellationCandidate;

    // 제안 시각
    @Column(name = "offered_at", nullable = false)
    private Instant offeredAt;

    // 제안 만료 시각
    @Column(name = "offer_expires_at", nullable = false)
    private Instant offerExpiresAt;

    // 제안 상태
    @Enumerated(EnumType.STRING)
    @Column(name = "offer_status", nullable = false, length = 30)
    private OfferStatus offerStatus;

    // 수락 시각
    @Column(name = "accepted_at")
    private Instant acceptedAt;

    // 패스 시각
    @Column(name = "passed_at")
    private Instant passedAt;

    // 생성 시각
    @Column(name = "created_at")
    private Instant createdAt;

    // 변경 시각
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum OfferStatus {
        UNACCEPTED,
        ACCEPTED,
        PASSED,
        EXPIRED
    }

    /**
     * 취소 제안 엔티티를 생성합니다.
     *
     * @param cancellationCandidate 제안을 받는 대기 후보
     * @param offeredAt 제안 시각
     * @param offerExpiresAt 제안 만료 시각
     * @param offerStatus 제안 상태
     * @param acceptedAt 수락 시각
     * @param passedAt 패스 시각
     */
    @Builder
    public CancellationOffer(
            CancellationCandidate cancellationCandidate,
            Instant offeredAt,
            Instant offerExpiresAt,
            OfferStatus offerStatus,
            Instant acceptedAt,
            Instant passedAt
    ) {
        this.cancellationCandidate = cancellationCandidate;
        this.offeredAt = offeredAt;
        this.offerExpiresAt = offerExpiresAt;
        this.offerStatus = offerStatus;
        this.acceptedAt = acceptedAt;
        this.passedAt = passedAt;
    }
}
