package com.ssafy.tickle.queue.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 시간대별 대기열 통계 스냅샷을 기록하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "queue_histories")
public class QueueHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "queue_history_id", nullable = false, updatable = false)
    private Long id;

    // 대기열 scope를 기록할지 고민이지만 현재는 eventId 단위로 기록 (QueueScope.BOOKING 기준)
    @Column(name = "event_id", nullable = false, updatable = false)
    private Long eventId;

    @Column(name = "total_waiting", nullable = false, updatable = false)
    private Long totalWaiting;

    @Column(name = "processing_count", nullable = false, updatable = false)
    private Long processingCount;

    @Column(name = "average_wait_seconds", nullable = false, updatable = false)
    private Long averageWaitSeconds;

    @Column(name = "inflow_count", nullable = false, updatable = false)
    private Long inflowCount;

    @Column(name = "admitted_count", nullable = false, updatable = false)
    private Long admittedCount;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt;

    @Builder
    public QueueHistory(
            Long eventId,
            Long totalWaiting,
            Long processingCount,
            Long averageWaitSeconds,
            Long inflowCount,
            Long admittedCount,
            Instant recordedAt
    ) {
        this.eventId = eventId;
        this.totalWaiting = totalWaiting;
        this.processingCount = processingCount;
        this.averageWaitSeconds = averageWaitSeconds;
        this.inflowCount = inflowCount;
        this.admittedCount = admittedCount;
        this.recordedAt = recordedAt;
    }
}
