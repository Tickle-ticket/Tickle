package com.ssafy.tickle.event.infrastructure.persistence;

import com.ssafy.tickle.event.domain.EventSession;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

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
     * 여러 공연의 회차를 시작 시각 순으로 조회합니다.
     *
     * @param eventIds 이벤트 식별자 목록
     * @return 회차 목록
     */
    @EntityGraph(attributePaths = {"event"})
    List<EventSession> findByEventIdInOrderByStartAtAsc(List<Long> eventIds);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from EventSession s where s.event.id = :eventId")
    void deleteByEventId(@Param("eventId") Long eventId);

    /**
     * 공연 ID와 회차 ID가 일치하는 회차를 조회합니다.
     *
     * <p>좌석 배치도 조회 시 회차가 해당 공연에 속하는지 한 번의 쿼리로 검증합니다.
     * Event LAZY 로딩 없이 event_id 컬럼 직접 필터링으로 N+1을 방지합니다.</p>
     *
     * @param sessionId 회차 식별자
     * @param eventId   공연 식별자
     * @return 해당 공연에 속하는 회차 Optional
     */
    @Query("SELECT s FROM EventSession s WHERE s.id = :sessionId AND s.event.id = :eventId")
    Optional<EventSession> findByIdAndEventId(
            @Param("sessionId") Long sessionId,
            @Param("eventId") Long eventId
    );
}
