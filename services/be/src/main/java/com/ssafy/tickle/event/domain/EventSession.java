package com.ssafy.tickle.event.domain;

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

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

/**
 * 이벤트의 회차별 일정과 판매 상태를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "event_sessions")
public class EventSession {

    // 회차 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_id", nullable = false, updatable = false)
    private Long id;

    // 공연 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    // 회차 번호
    @Column(name = "session_no", nullable = false)
    private Integer sessionNo;

    // 시작 시각
    @Column(name = "start_at", nullable = false)
    private Instant startAt;

    // 종료 시각
    @Column(name = "end_at", nullable = false)
    private Instant endAt;

    // 판매 오픈 시각
    @Column(name = "sales_open_at", nullable = false)
    private Instant salesOpenAt;

    // 판매 종료 시각
    @Column(name = "sales_close_at", nullable = false)
    private Instant salesCloseAt;

    // 상태
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private Status status;

    // 생성 시각
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // 수정 시각
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum Status {
        PENDING,
        OPENED,
        CLOSED,
        FINISHED,
        CANCELLED
    }

    /**
     * 이벤트 회차 엔티티를 생성합니다.
     *
     * @param event 대상 이벤트
     * @param sessionNo 회차 번호
     * @param startAt 시작 시각
     * @param endAt 종료 시각
     * @param salesOpenAt 예매 오픈 시각
     * @param salesCloseAt 예매 마감 시각
     * @param status 회차 상태
     */
    @Builder
    public EventSession(
            Event event,
            Integer sessionNo,
            Instant startAt,
            Instant endAt,
            Instant salesOpenAt,
            Instant salesCloseAt,
            Status status
    ) {
        this.event = event;
        this.sessionNo = sessionNo;
        this.startAt = startAt;
        this.endAt = endAt;
        this.salesOpenAt = salesOpenAt;
        this.salesCloseAt = salesCloseAt;
        this.status = status;
    }
}
