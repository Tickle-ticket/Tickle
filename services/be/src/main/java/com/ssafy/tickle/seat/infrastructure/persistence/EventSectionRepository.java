package com.ssafy.tickle.seat.infrastructure.persistence;

import com.ssafy.tickle.seat.domain.EventSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 이벤트 구역 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface EventSectionRepository extends JpaRepository<EventSection, Long> {

    /**
     * 공연의 구역 목록을 노출 순서대로 조회합니다.
     *
     * @param eventId 공연 식별자
     * @return 구역 목록
     */
    List<EventSection> findByEventIdOrderByDisplayOrderAsc(Long eventId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from EventSection sec where sec.event.id = :eventId")
    void deleteByEventId(@Param("eventId") Long eventId);
}
