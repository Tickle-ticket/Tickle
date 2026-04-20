package com.ssafy.tickle.event.infrastructure.persistence;

import com.ssafy.tickle.event.domain.EventSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 이벤트 회차 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface EventSessionRepository extends JpaRepository<EventSession, Long> {

    /**
     * 이벤트 회차를 시작 시각 순으로 조회합니다.
     *
     * @param eventId 이벤트 식별자
     * @return 회차 목록
     */
    List<EventSession> findByEvent_IdOrderByStartAtAsc(Long eventId);
}
