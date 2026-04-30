package com.ssafy.tickle.reservation.domain;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.payment.domain.PaymentErrorCode;
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
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

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
    @OnDelete(action = OnDeleteAction.CASCADE)
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

    // 티켓 가격
    @Column(name = "actual_price_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal ticketPriceAmount;

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
        DRAFT,
        PENDING_PAYMENT,
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
     * @param ticketPriceAmount 티켓 가격
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
            BigDecimal ticketPriceAmount,
            BigDecimal serviceFeeAmount,
            BigDecimal finalPriceAmount,
            Instant cancelledAt
    ) {
        this.booking = booking;
        this.sessionSeat = sessionSeat;
        this.ticketStatus = ticketStatus;
        this.ticketNo = ticketNo;
        this.ticketPriceAmount = ticketPriceAmount;
        this.serviceFeeAmount = serviceFeeAmount;
        this.finalPriceAmount = finalPriceAmount;
        this.cancelledAt = cancelledAt;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    /**
     * 예매 초안 단계의 티켓 엔티티를 생성합니다.
     *
     * @param booking 상위 예매
     * @param sessionSeat 연결 좌석
     * @param ticketNo 티켓 번호
     * @param ticketPriceAmount 티켓 가격
     * @param serviceFeeAmount 수수료
     * @param finalPriceAmount 최종 결제 금액
     * @return 생성된 티켓 엔티티
     */
    public static BookingTicket draft(
            Booking booking,
            SessionSeat sessionSeat,
            String ticketNo,
            BigDecimal ticketPriceAmount,
            BigDecimal serviceFeeAmount,
            BigDecimal finalPriceAmount
    ) {
        return BookingTicket.builder()
                .booking(booking)
                .sessionSeat(sessionSeat)
                .ticketStatus(Status.DRAFT)
                .ticketNo(ticketNo)
                .ticketPriceAmount(ticketPriceAmount)
                .serviceFeeAmount(serviceFeeAmount)
                .finalPriceAmount(finalPriceAmount)
                .build();
    }

    /**
     * 예매 초안 티켓을 무통장 입금 대기 상태로 전환합니다.
     *
     * <p>이 상태는 결제 준비가 끝났고 입금 확정만 남았음을 의미한다.</p>
     */
    public void markPendingPayment() {
        if (this.ticketStatus != Status.DRAFT) {
            throw new BaseException(PaymentErrorCode.PAYMENT_INVALID_STATE);
        }
        this.ticketStatus = Status.PENDING_PAYMENT;
        this.updatedAt = Instant.now();
    }

    /**
     * 결제가 완료된 예매 티켓을 확정 상태로 전환합니다.
     *
     * <p>무통장 입금이 확인되면 최종 예매 티켓으로 본다.</p>
     */
    public void confirmBooking() {
        if (this.ticketStatus != Status.PENDING_PAYMENT) {
            throw new BaseException(PaymentErrorCode.PAYMENT_INVALID_STATE);
        }
        this.ticketStatus = Status.BOOKED;
        this.updatedAt = Instant.now();
    }

    /**
     * 입금 만료로 티켓을 만료 상태로 전환합니다.
     *
     * <p>대기 중인 티켓만 만료 대상이며, 그 외 상태는 건드리지 않는다.</p>
     */
    public void expire() {
        if (this.ticketStatus != Status.PENDING_PAYMENT) {
            return;
        }
        this.ticketStatus = Status.EXPIRED;
        this.updatedAt = Instant.now();
    }
}
