package com.ssafy.tickle.cancellation.domain;

import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.user.domain.User;
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
import jakarta.persistence.Version;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

/**
 * 취소 좌석에 대한 재예매 대기 후보 정보를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "cancellation_candidates")
public class CancellationCandidate {

    // 취소표 대기열 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cancellation_candidate_id", nullable = false, updatable = false)
    private Long id;

    // 공연 좌석 ID FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_seat_id", nullable = false)
    private SessionSeat sessionSeat;

    // 사용자 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 대기 순번
    @Column(name = "waiting_rank", nullable = false)
    private Integer waitingRank;

    // 상태
    @Enumerated(EnumType.STRING)
    @Column(name = "candidate_status", nullable = false, length = 30)
    private Status status;

    // 버전
    @Version
    @Column(name = "version_no", nullable = false)
    private Long versionNo;

    // 대기 취소 시각
    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    // 대기 시각
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // 변경 시각
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum Status {
        WAITING,
        CANCELLED
    }

    /**
     * 예매 대기 신청을 취소 상태로 전환합니다.
     *
     * @param cancelledAt 대기 신청 취소 시각
     */
    public void cancel(Instant cancelledAt) {
        this.status = Status.CANCELLED;
        this.cancelledAt = cancelledAt;
        this.updatedAt = cancelledAt;
    }

    /**
     * 취소 대기 후보 엔티티를 생성합니다.
     *
     * @param sessionSeat 취소된 회차 좌석
     * @param user 대기 사용자
     * @param waitingRank 대기 순번
     * @param status 대기 후보 상태
     * @param versionNo 낙관적 락 버전
     * @param cancelledAt 취소 발생 시각
     */
    @Builder
    public CancellationCandidate(
            SessionSeat sessionSeat,
            User user,
            Integer waitingRank,
            Status status,
            Long versionNo,
            Instant cancelledAt
    ) {
        Instant now = Instant.now();
        this.sessionSeat = sessionSeat;
        this.user = user;
        this.waitingRank = waitingRank;
        this.status = status == null ? Status.WAITING : status;
        this.versionNo = versionNo == null ? 1L : versionNo;
        this.cancelledAt = cancelledAt;
        this.createdAt = now;
        this.updatedAt = now;
    }
}
