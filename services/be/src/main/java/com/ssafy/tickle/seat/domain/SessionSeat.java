package com.ssafy.tickle.seat.domain;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.event.domain.EventSession;
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

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

/**
 * 이벤트 회차별 좌석 판매 상태를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "session_seats")
public class SessionSeat {

    // 회차 좌석 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_seat_id", nullable = false, updatable = false)
    private Long id;

    // 회차 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private EventSession session;

    // 좌석 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_seat_id", nullable = false)
    private EventSeat eventSeat;

    // 구역 FK
    @Column(name = "event_section_id")
    private Long eventSectionId;

    // 판매 상태
    @Enumerated(EnumType.STRING)
    @Column(name = "sale_status", nullable = false, length = 30)
    private SaleStatus saleStatus;

    // 버전
    @Version
    @Column(name = "version_no", nullable = false)
    private Long versionNo;

    // 수정 시각
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum SaleStatus {
        /** 빈 좌석. 누구나 선점 가능 */
        AVAILABLE,
        /** 선점 중. Redis 분산락 + 15분 TTL. 취소표 대기 신청 불가 */
        HELD,
        /** 입금대기. 무통장 입금 클릭 후 입금 전 상태. 24시간 TTL. 취소표 대기 신청 가능 */
        PENDING,
        /** 예매 확정. 결제 완료. 취소표 대기 신청 가능 */
        CONFIRMED,
        /** 관리자 지정 차단 좌석 (VIP석, 스태프석 등) */
        BLOCKED,
        /** 물리적 사용 불가 좌석 (기둥 가림, 무대 인접 등) */
        UNAVAILABLE
    }

    /**
     * 회차별 좌석 엔티티를 생성합니다.
     *
     * @param session 대상 회차
     * @param eventSeat 원본 이벤트 좌석
     * @param eventSectionId 이벤트 구역 식별자
     * @param saleStatus 판매 상태
     * @param versionNo 낙관적 락 버전
     */
    @Builder
    public SessionSeat(
            EventSession session,
            EventSeat eventSeat,
            Long eventSectionId,
            SaleStatus saleStatus,
            Long versionNo
    ) {
        this.session = session;
        this.eventSeat = eventSeat;
        this.eventSectionId = eventSectionId;
        this.saleStatus = saleStatus;
        this.versionNo = versionNo;
    }

    /**
     * 좌석을 선점 상태로 전환합니다.
     *
     * <p>AVAILABLE 상태인 경우에만 HELD로 전환 가능합니다.</p>
     *
     * @throws BaseException 선점 불가 상태인 경우 (SEAT_ALREADY_HELD)
     */
    public void hold() {
        if (this.saleStatus != SaleStatus.AVAILABLE) {
            throw new BaseException(SeatErrorCode.SEAT_ALREADY_HELD);
        }
        this.saleStatus = SaleStatus.HELD;
        this.updatedAt = Instant.now();
    }

    /**
     * 선점된 좌석을 다시 빈 좌석으로 해제합니다.
     *
     * <p>HELD 상태인 경우에만 AVAILABLE로 복구 가능합니다.
     * 이미 해제됐거나 다른 상태인 경우 조용히 무시합니다 (멱등성).</p>
     */
    public void release() {
        if (this.saleStatus != SaleStatus.HELD) {
            return;
        }
        this.saleStatus = SaleStatus.AVAILABLE;
        this.updatedAt = Instant.now();
    }
}
