package com.ssafy.tickle.reservation.infrastructure.persistence;

import com.ssafy.tickle.reservation.domain.BookingTicketStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 예매 티켓 상태 이력 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface BookingTicketStatusHistoryRepository extends JpaRepository<BookingTicketStatusHistory, Long> {
}
