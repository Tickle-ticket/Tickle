package com.ssafy.tickle.event.infrastructure.persistence;

import com.ssafy.tickle.event.domain.Event;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * 이벤트 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface EventRepository extends JpaRepository<Event, Long> {

    /**
     * 상세 조회에 필요한 연관 엔티티를 함께 로딩한 이벤트를 조회합니다.
     *
     * @param eventId 이벤트 식별자
     * @return 이벤트 Optional
     */
    @EntityGraph(attributePaths = {"organizer", "venue", "category"})
    Optional<Event> findWithDetailsById(Long eventId);
}
