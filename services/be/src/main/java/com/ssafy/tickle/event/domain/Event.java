package com.ssafy.tickle.event.domain;

import com.ssafy.tickle.venue.domain.Venue;
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

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

/**
 * 판매 및 운영 대상이 되는 이벤트 정보를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "events")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id", nullable = false, updatable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizer_id", nullable = false)
    private Organizer organizer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_id", nullable = false)
    private Venue venue;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 30)
    private EventType eventType;

    @Column(name = "sales_start_at", nullable = false)
    private Instant salesStartAt;

    @Column(name = "sales_end_at", nullable = false)
    private Instant salesEndAt;

    @Column(name = "event_start_at", nullable = false)
    private Instant eventStartAt;

    @Column(name = "event_end_at", nullable = false)
    private Instant eventEndAt;

    @Lob
    @Column(name = "metadata")
    private String metadata;

    @Lob
    @Column(name = "notice")
    private String notice;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private Status status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum EventType {
        CONCERT,
        MUSICAL,
        PLAY,
        CLASSIC,
        SPORTS,
        FANMEETING
    }

    public enum Status {
        PENDING,
        OPENED,
        CLOSED,
        FINISHED,
        CANCELLED
    }

    /**
     * 이벤트 엔티티를 생성합니다.
     *
     * @param organizer 주최자
     * @param venue 공연장
     * @param title 이벤트 제목
     * @param eventType 이벤트 유형
     * @param salesStartAt 판매 시작 시각
     * @param salesEndAt 판매 종료 시각
     * @param eventStartAt 이벤트 시작 시각
     * @param eventEndAt 이벤트 종료 시각
     * @param metadata 추가 메타데이터
     * @param notice 공지 사항
     * @param status 이벤트 상태
     */
    @Builder
    public Event(
            Organizer organizer,
            Venue venue,
            String title,
            EventType eventType,
            Instant salesStartAt,
            Instant salesEndAt,
            Instant eventStartAt,
            Instant eventEndAt,
            String metadata,
            String notice,
            Status status
    ) {
        this.organizer = organizer;
        this.venue = venue;
        this.title = title;
        this.eventType = eventType;
        this.salesStartAt = salesStartAt;
        this.salesEndAt = salesEndAt;
        this.eventStartAt = eventStartAt;
        this.eventEndAt = eventEndAt;
        this.metadata = metadata;
        this.notice = notice;
        this.status = status;
    }
}
