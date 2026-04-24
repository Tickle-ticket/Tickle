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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.ssafy.tickle.venue.domain.Venue;

import java.time.Instant;
import java.util.List;

import static lombok.AccessLevel.PROTECTED;

/**
 * 판매 및 운영 대상이 되는 이벤트 정보를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "events")
public class Event {

    // 공연 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id", nullable = false, updatable = false)
    private Long id;

    // 주최자 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizer_id", nullable = false)
    private Organizer organizer;

    // 공연장 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_id", nullable = false)
    private Venue venue;

    // 제목
    @Column(name = "title", nullable = false, length = 255)
    private String title;

    // 카테고리 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    // 판매 시작 시각
    @Column(name = "sales_start_at", nullable = false)
    private Instant salesStartAt;

    // 판매 종료 시각
    @Column(name = "sales_end_at", nullable = false)
    private Instant salesEndAt;

    // 이벤트 시작 시각
    @Column(name = "event_start_at", nullable = false)
    private Instant eventStartAt;

    // 이벤트 종료 시각
    @Column(name = "event_end_at", nullable = false)
    private Instant eventEndAt;

    // 메타데이터
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "json")
    private EventMetadata metadata;

    // 공지사항
    @Column(name = "notice", columnDefinition = "TEXT")
    private String notice;

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

    public record EventMetadata(
            List<String> tags
    ) {}

    /**
     * 이벤트 엔티티를 생성합니다.
     *
     * @param organizer 주최자
     * @param venue 공연장
     * @param title 이벤트 제목
     * @param category 이벤트 카테고리
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
            Category category,
            Instant salesStartAt,
            Instant salesEndAt,
            Instant eventStartAt,
            Instant eventEndAt,
            EventMetadata metadata,
            String notice,
            Status status
    ) {
        this.organizer = organizer;
        this.venue = venue;
        this.title = title;
        this.category = category;
        this.salesStartAt = salesStartAt;
        this.salesEndAt = salesEndAt;
        this.eventStartAt = eventStartAt;
        this.eventEndAt = eventEndAt;
        this.metadata = metadata;
        this.notice = notice;
        this.status = status;
    }
}
