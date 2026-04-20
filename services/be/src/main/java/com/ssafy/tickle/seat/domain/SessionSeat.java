package com.ssafy.tickle.seat.domain;

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
        AVAILABLE,
        HELD,
        BOOKED,
        BLOCKED,
        UNAVAILABLE,
        BANNED
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
}
