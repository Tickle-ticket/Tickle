package com.ssafy.tickle.venue.domain;

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
 * 공연장 내 좌석 구역 정보를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "venue_sections")
public class VenueSection {

    // 공연장 구역 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "section_id", nullable = false, updatable = false)
    private Long id;

    // 공연장 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_id", nullable = false)
    private Venue venue;

    // 구역명
    @Column(name = "section_name", nullable = false, length = 100)
    private String sectionName;

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
     * 공연장 구역 엔티티를 생성합니다.
     *
     * @param venue 대상 공연장
     * @param sectionName 구역명
     * @param displayOrder 노출 순서
     */
    @Builder
    public VenueSection(Venue venue, String sectionName, Integer displayOrder) {
        this.venue = venue;
        this.sectionName = sectionName;
        this.displayOrder = displayOrder;
    }
}
