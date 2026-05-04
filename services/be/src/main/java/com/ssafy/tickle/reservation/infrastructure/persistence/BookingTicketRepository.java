package com.ssafy.tickle.reservation.infrastructure.persistence;

import com.ssafy.tickle.reservation.domain.BookingTicket;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 예매 티켓 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface BookingTicketRepository extends JpaRepository<BookingTicket, Long> {

    /**
     * 예매에 속한 티켓 목록을 조회합니다.
     *
     * @param bookingId 예매 식별자
     * @return 티켓 목록
     */
    List<BookingTicket> findByBookingId(Long bookingId);

    /**
     * 예매 ID에 속한 모든 티켓을 조회합니다.
     *
     * <p>N+1 방지를 위해 sessionSeat → eventSeat → eventSection을 함께 로딩합니다.</p>
     *
     * @param bookingId 예매 식별자
     * @return 티켓 목록
     */
    @EntityGraph(attributePaths = {"sessionSeat", "sessionSeat.eventSeat", "sessionSeat.eventSeat.eventSection"})
    List<BookingTicket> findAllByBookingId(@Param("bookingId") Long bookingId);

    /**
     * 사용자와 회차 기준으로 특정 상태의 티켓 수를 조회합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionId 회차 식별자
     * @param ticketStatus 티켓 상태
     * @return 조건에 맞는 티켓 수
     */
    @Query("""
            select count(bt.id)
            from BookingTicket bt
            where bt.booking.user.id = :userId
              and bt.booking.session.id = :sessionId
              and bt.ticketStatus = :ticketStatus
            """)
    long countByUserIdAndSessionIdAndTicketStatus(
            @Param("userId") Long userId,
            @Param("sessionId") Long sessionId,
            @Param("ticketStatus") BookingTicket.Status ticketStatus
    );
}
