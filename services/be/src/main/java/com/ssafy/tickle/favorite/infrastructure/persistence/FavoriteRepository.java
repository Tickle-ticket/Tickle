package com.ssafy.tickle.favorite.infrastructure.persistence;

import com.ssafy.tickle.favorite.domain.Favorite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * 공연 찜 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    void deleteByEvent_Id(Long eventId);

    boolean existsByUser_IdAndEvent_Id(Long userId, Long eventId);

    Optional<Favorite> findByUser_IdAndEvent_Id(Long userId, Long eventId);

    @Query("""
            select f.event.id
            from Favorite f
            where f.user.id = :userId
              and f.event.id in :eventIds
            """)
    List<Long> findFavoriteEventIdsByUserIdAndEventIds(
            @Param("userId") Long userId,
            @Param("eventIds") List<Long> eventIds
    );

    @EntityGraph(attributePaths = {"event", "event.venue", "event.category"})
    Page<Favorite> findByUser_IdOrderByCreatedAtDescIdDesc(Long userId, Pageable pageable);
}
