package com.ssafy.tickle.venue.domain;

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

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "venue_seat_id", nullable = false, updatable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private VenueSection section;

    @Column(name = "venue_id")
    private Long venueId;

    @Column(name = "row_label", nullable = false, length = 30)
    private String rowLabel;

    @Column(name = "seat_number", nullable = false, length = 30)
    private String seatNumber;

    @Column(name = "seat_label", nullable = false, length = 50)
    private String seatLabel;

    @Enumerated(EnumType.STRING)
    @Column(name = "seat_type", nullable = false, length = 30)
    private SeatType seatType;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum SeatType {
        REGULAR,
        VIP,
        R,
        S,
        A,
        RESTRICTED_VIEW
    }

    /**
     * 공연장 좌석 엔티티를 생성합니다.
     *
     * @param section 좌석이 속한 공연장 구역
     * @param venueId 공연장 식별자
     * @param rowLabel 열 라벨
     * @param seatNumber 좌석 번호
     * @param seatLabel 좌석 표기명
     * @param seatType 좌석 유형
     */
    @Builder
    public VenueSeat(
            VenueSection section,
            Long venueId,
            String rowLabel,
            String seatNumber,
            String seatLabel,
            SeatType seatType
    ) {
        this.section = section;
        this.venueId = venueId;
        this.rowLabel = rowLabel;
        this.seatNumber = seatNumber;
        this.seatLabel = seatLabel;
        this.seatType = seatType;
    }
}
