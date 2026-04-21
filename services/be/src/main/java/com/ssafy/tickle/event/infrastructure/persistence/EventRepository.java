package com.ssafy.tickle.event.infrastructure.persistence;

import com.ssafy.tickle.event.domain.Event;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    /**
     * 제목 키워드와 카테고리 조건으로 이벤트 목록을 조회합니다.
     *
     * @param keyword 제목 검색어
     * @param categoryId 카테고리 식별자
     * @param pageable 페이징 정보
     * @return 이벤트 페이지
     */
    @EntityGraph(attributePaths = {"organizer", "venue", "category"})
    @Query("""
            select e
            from Event e
            where (:keyword is null or lower(e.title) like lower(concat('%', :keyword, '%')))
              and (:categoryId is null or e.category.id = :categoryId)
            """)
    Page<Event> searchEvents(
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            Pageable pageable
    );
}
