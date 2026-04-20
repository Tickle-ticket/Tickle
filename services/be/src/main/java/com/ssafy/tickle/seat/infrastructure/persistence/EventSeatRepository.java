package com.ssafy.tickle.seat.infrastructure.persistence;

import com.ssafy.tickle.seat.domain.EventSeat;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 이벤트 좌석 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface EventSeatRepository extends JpaRepository<EventSeat, Long> {
}
