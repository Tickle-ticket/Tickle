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

    // 티켓 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "booking_ticket_id", nullable = false, updatable = false)
    private Long id;

    // 예매 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    // 좌석 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_seat_id", nullable = false)
    private SessionSeat sessionSeat;

    // 상태
    @Enumerated(EnumType.STRING)
    @Column(name = "ticket_status", nullable = false, length = 30)
    private Status ticketStatus;

    // 외부 노출 티켓 번호
    @Column(name = "ticket_no", nullable = false, length = 50)
    private String ticketNo;

    // 실판매가
    @Column(name = "actual_price_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal actualPriceAmount;

    // 수수료
    @Column(name = "service_fee_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal serviceFeeAmount;

    // 최종 결제 금액
    @Column(name = "final_price_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal finalPriceAmount;

    // 취소 시각
    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    // 생성 시각
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // 수정 시각
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
     * @param ticketNo 외부 노출 티켓 번호
     * @param actualPriceAmount 실판매가
     * @param serviceFeeAmount 수수료
     * @param finalPriceAmount 최종 결제 금액
     * @param cancelledAt 취소 시각
     */
    @Builder
    public BookingTicket(
            Booking booking,
            SessionSeat sessionSeat,
            Status ticketStatus,
            String ticketNo,
            BigDecimal actualPriceAmount,
            BigDecimal serviceFeeAmount,
            BigDecimal finalPriceAmount,
            Instant cancelledAt
    ) {
        this.booking = booking;
        this.sessionSeat = sessionSeat;
        this.ticketStatus = ticketStatus;
        this.ticketNo = ticketNo;
        this.actualPriceAmount = actualPriceAmount;
        this.serviceFeeAmount = serviceFeeAmount;
        this.finalPriceAmount = finalPriceAmount;
        this.cancelledAt = cancelledAt;
    }
}
