package com.ssafy.tickle.event.infrastructure.persistence;

import com.ssafy.tickle.event.domain.EventSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
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
    List<EventSession> findByEventIdOrderByStartAtAsc(Long eventId);

    /**
     * 아직 판매 종료되지 않았고, 지정한 시각 이전에 예매 오픈하는 회차를 조회합니다.
     *
     * @param salesCloseAt 판매 종료 하한 시각
     * @param salesOpenAt 판매 오픈 상한 시각
     * @return 오픈 중이거나 곧 오픈할 회차 목록
     */
    List<EventSession> findBySalesCloseAtAfterAndSalesOpenAtBefore(Instant salesCloseAt, Instant salesOpenAt);
}
