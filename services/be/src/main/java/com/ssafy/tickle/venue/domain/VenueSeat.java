package com.ssafy.tickle.venue.domain;

import com.ssafy.tickle.common.domain.SeatGrade;
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
 * 공연장 구역에 속한 실제 좌석 정보를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "venue_seats")
public class VenueSeat {

    // 공연장 좌석 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "venue_seat_id", nullable = false, updatable = false)
    private Long id;

    // 구역 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private VenueSection section;

    // 공연장 FK
    @Column(name = "venue_id")
    private Long venueId;

    // 열
    @Column(name = "row_label", nullable = false, length = 30)
    private String rowLabel;

    // 번호
    @Column(name = "seat_number", nullable = false, length = 30)
    private String seatNumber;

    // 표시명
    @Column(name = "seat_label", nullable = false, length = 50)
    private String seatLabel;

    // 좌석 등급
    @Enumerated(EnumType.STRING)
    @Column(name = "seat_type", nullable = false, length = 30)
    private SeatGrade seatGrade;

    // 생성 시각
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // 수정 시각
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * 공연장 좌석 엔티티를 생성합니다.
     *
     * @param section 좌석이 속한 공연장 구역
     * @param venueId 공연장 식별자
     * @param rowLabel 열 라벨
     * @param seatNumber 좌석 번호
     * @param seatLabel 좌석 표기명
     * @param seatGrade 좌석 등급
     */
    @Builder
    public VenueSeat(
            VenueSection section,
            Long venueId,
            String rowLabel,
            String seatNumber,
            String seatLabel,
            SeatGrade seatGrade
    ) {
        this.section = section;
        this.venueId = venueId;
        this.rowLabel = rowLabel;
        this.seatNumber = seatNumber;
        this.seatLabel = seatLabel;
        this.seatGrade = seatGrade;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }
}
