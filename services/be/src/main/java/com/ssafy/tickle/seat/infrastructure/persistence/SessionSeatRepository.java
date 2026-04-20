package com.ssafy.tickle.seat.infrastructure.persistence;

import com.ssafy.tickle.seat.domain.SessionSeat;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 회차별 좌석 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface SessionSeatRepository extends JpaRepository<SessionSeat, Long> {
}
