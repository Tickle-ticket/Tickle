package com.ssafy.tickle.cancellation.domain;

import com.ssafy.tickle.reservation.domain.BookingTicket;
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
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

/**
 * 예매 티켓의 취소 요청 정보를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "cancellation_requests")
public class CancellationRequest {

    // 취소 요청 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cancellation_request_id", nullable = false, updatable = false)
    private Long id;

    // 예매 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "booking_ticket_id", nullable = false)
    private BookingTicket bookingTicket;

    // 상태
    @Enumerated(EnumType.STRING)
    @Column(name = "cancellation_status", nullable = false, columnDefinition = "varchar(30)")
    private Status cancellationStatus;

    // 요청 시각
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public enum Status {
        REQUESTED,
        APPROVED,
        REJECTED,
        COMPLETED
    }

    /**
     * 취소 요청 엔티티를 생성합니다.
     *
     * @param bookingTicket 취소 대상 예매 티켓
     * @param cancellationStatus 취소 요청 상태
     */
    @Builder
    public CancellationRequest(BookingTicket bookingTicket, Status cancellationStatus) {
        this.bookingTicket = bookingTicket;
        this.cancellationStatus = cancellationStatus;
    }
}
