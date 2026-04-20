package com.ssafy.tickle.reservation.domain;

import com.ssafy.tickle.seat.domain.SessionSeat;
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

import java.math.BigDecimal;
import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

/**
 * 예매에 포함된 개별 티켓 정보를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "booking_tickets")
public class BookingTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "booking_ticket_id", nullable = false, updatable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_seat_id", nullable = false)
    private SessionSeat sessionSeat;

    @Enumerated(EnumType.STRING)
    @Column(name = "ticket_status", nullable = false, length = 30)
    private Status ticketStatus;

    @Column(name = "face_price_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal facePriceAmount;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum Status {
        BOOKED,
        CANCELLED,
        USED,
        EXPIRED
    }

    /**
     * 예매 티켓 엔티티를 생성합니다.
     *
     * @param booking 상위 예매
     * @param sessionSeat 연결된 회차 좌석
     * @param ticketStatus 티켓 상태
     * @param facePriceAmount 권면가
     * @param cancelledAt 취소 시각
     */
    @Builder
    public BookingTicket(
            Booking booking,
            SessionSeat sessionSeat,
            Status ticketStatus,
            BigDecimal facePriceAmount,
            Instant cancelledAt
    ) {
        this.booking = booking;
        this.sessionSeat = sessionSeat;
        this.ticketStatus = ticketStatus;
        this.facePriceAmount = facePriceAmount;
        this.cancelledAt = cancelledAt;
    }
}
