package com.ssafy.tickle.seat.infrastructure.persistence;

import com.ssafy.tickle.seat.domain.EventSeat;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 이벤트 좌석 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface EventSeatRepository extends JpaRepository<EventSeat, Long> {

    /**
     * 공연 좌석 목록을 구역/행/번호 순으로 조회합니다.
     *
     * @param eventId 공연 식별자
     * @return 공연 좌석 목록
     */
    @EntityGraph(attributePaths = {"eventSection", "eventPricePolicy"})
    List<EventSeat> findByEventSection_Event_IdOrderByEventSection_DisplayOrderAscRowLabelAscSeatNumberAsc(Long eventId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from EventSeat es where es.eventSection.event.id = :eventId")
    void deleteByEventId(@Param("eventId") Long eventId);
}
