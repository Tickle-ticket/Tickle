package com.ssafy.tickle.reservation.infrastructure.persistence;

import com.ssafy.tickle.reservation.domain.BookingTicket;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
