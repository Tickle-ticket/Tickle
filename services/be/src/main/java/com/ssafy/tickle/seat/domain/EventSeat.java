package com.ssafy.tickle.seat.domain;

import com.ssafy.tickle.event.domain.EventPricePolicy;
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
 * 이벤트 구역에 매핑된 판매 좌석 정보를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "event_seats")
public class EventSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_seat_id", nullable = false, updatable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_section_id", nullable = false)
    private EventSection eventSection;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_price_policy_id", nullable = false)
    private EventPricePolicy eventPricePolicy;

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
     * 이벤트 좌석 엔티티를 생성합니다.
     *
     * @param eventSection 좌석이 속한 이벤트 구역
     * @param eventPricePolicy 좌석 가격 정책
     * @param venueId 공연장 식별자
     * @param rowLabel 열 라벨
     * @param seatNumber 좌석 번호
     * @param seatLabel 좌석 표기명
     * @param seatType 좌석 유형
     */
    @Builder
    public EventSeat(
            EventSection eventSection,
            EventPricePolicy eventPricePolicy,
            Long venueId,
            String rowLabel,
            String seatNumber,
            String seatLabel,
            SeatType seatType
    ) {
        this.eventSection = eventSection;
        this.eventPricePolicy = eventPricePolicy;
        this.venueId = venueId;
        this.rowLabel = rowLabel;
        this.seatNumber = seatNumber;
        this.seatLabel = seatLabel;
        this.seatType = seatType;
    }
}
