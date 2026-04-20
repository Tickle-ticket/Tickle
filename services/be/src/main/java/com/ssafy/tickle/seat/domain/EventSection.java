package com.ssafy.tickle.seat.domain;

import com.ssafy.tickle.event.domain.Event;
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

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

/**
 * 이벤트에서 사용하는 좌석 구역 정보를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "event_sections")
public class EventSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_section_id", nullable = false, updatable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Column(name = "venue_id")
    private Long venueId;

    @Column(name = "section_name", nullable = false, length = 100)
    private String sectionName;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * 이벤트 구역 엔티티를 생성합니다.
     *
     * @param event 대상 이벤트
     * @param venueId 공연장 식별자
     * @param sectionName 구역명
     * @param displayOrder 노출 순서
     */
    @Builder
    public EventSection(Event event, Long venueId, String sectionName, Integer displayOrder) {
        this.event = event;
        this.venueId = venueId;
        this.sectionName = sectionName;
        this.displayOrder = displayOrder;
    }
}
