package com.ssafy.tickle.venue.infrastructure.persistence;

import com.ssafy.tickle.venue.domain.Venue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

/**
 * 공연장 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface VenueRepository extends JpaRepository<Venue, Long> {

    /**
     * 공연장 이름을 기준으로 정렬된 목록을 조회합니다.
     *
     * @return 정렬된 공연장 목록
     */
    @Query("select v from Venue v order by lower(v.venueName) asc, v.id asc")
    List<Venue> findAllOrderByVenueName();
}
