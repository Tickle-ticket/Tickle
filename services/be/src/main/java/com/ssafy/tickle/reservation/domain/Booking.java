package com.ssafy.tickle.reservation.domain;

import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.user.domain.User;
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
 * 사용자의 이벤트 예매 정보를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "bookings")
public class Booking {

    // 예매 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "booking_id", nullable = false, updatable = false)
    private Long id;

    // 예매번호
    @Column(name = "booking_no", nullable = false, length = 50)
    private String bookingNo;

    // 사용자 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 회차 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private EventSession session;

    // 상태
    @Enumerated(EnumType.STRING)
    @Column(name = "booking_status", nullable = false, length = 30)
    private Status bookingStatus;

    // 결제금액
    @Column(name = "total_paid_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalPaidAmount;

    // 수량
    @Column(name = "ticket_count", nullable = false)
    private Integer ticketCount;

    // 예매 시각
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // 수정 시각
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum Status {
        PENDING_PAYMENT,
        PAYMENT_IN_PROGRESS,
        CONFIRMED,
        PARTLY_CANCELLED,
        CANCELLED,
        REFUND_IN_PROGRESS,
        PAYMENT_FAILED,
        PAYMENT_EXPIRED
    }

    /**
     * 예매 엔티티를 생성합니다.
     *
     * @param bookingNo 예매 번호
     * @param user 예매 사용자
     * @param session 예매 회차
     * @param bookingStatus 예매 상태
     * @param totalPaidAmount 총 결제 금액
     * @param ticketCount 티켓 수량
     */
    @Builder
    public Booking(
            String bookingNo,
            User user,
            EventSession session,
            Status bookingStatus,
            BigDecimal totalPaidAmount,
            Integer ticketCount
    ) {
        this.bookingNo = bookingNo;
        this.user = user;
        this.session = session;
        this.bookingStatus = bookingStatus;
        this.totalPaidAmount = totalPaidAmount;
        this.ticketCount = ticketCount;
    }
}
