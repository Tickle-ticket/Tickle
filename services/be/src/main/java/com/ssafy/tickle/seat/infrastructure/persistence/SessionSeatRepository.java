package com.ssafy.tickle.seat.infrastructure.persistence;

import com.ssafy.tickle.seat.domain.SessionSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 회차별 좌석 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface SessionSeatRepository extends JpaRepository<SessionSeat, Long> {

    /**
     * 회차 ID 기준으로 좌석 전체를 fetch join하여 조회합니다.
     *
     * <p>EventSeat, EventSection, EventPricePolicy를 한 번에 로딩하여 N+1 문제를 방지합니다.</p>
     *
     * @param sessionId 회차 식별자
     * @return 좌석 목록 (구역 표시 순서 → 행 → 번호 오름차순)
     */
    @Query("""
            SELECT ss FROM SessionSeat ss
            JOIN FETCH ss.eventSeat es
            JOIN FETCH es.eventSection sec
            JOIN FETCH es.eventPricePolicy pp
            WHERE ss.session.id = :sessionId
            ORDER BY sec.displayOrder ASC, es.rowLabel ASC, es.seatNumber ASC
            """)
    List<SessionSeat> findBySessionIdWithDetails(@Param("sessionId") Long sessionId);
}
