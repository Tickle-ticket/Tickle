package com.ssafy.tickle.reservation.domain;

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
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

/**
 * 예매 티켓 상태 변경 이력을 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "booking_ticket_status_histories")
public class BookingTicketStatusHistory {

    // 예매 상태 변경 이력 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "booking_ticket_status_history_id", nullable = false, updatable = false)
    private Long id;

    // 티켓 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "booking_ticket_id", nullable = false)
    private BookingTicket bookingTicket;

    // 이전 상태
    @Column(name = "from_status", length = 30)
    private String fromStatus;

    // 변경 상태
    @Column(name = "to_status", nullable = false, length = 30)
    private String toStatus;

    // 변경 시각
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    /**
     * 예매 티켓 상태 이력 엔티티를 생성합니다.
     *
     * @param bookingTicket 대상 예매 티켓
     * @param fromStatus 변경 전 상태
     * @param toStatus 변경 후 상태
     */
    @Builder
    public BookingTicketStatusHistory(BookingTicket bookingTicket, String fromStatus, String toStatus) {
        this.bookingTicket = bookingTicket;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.createdAt = Instant.now();
    }
}
