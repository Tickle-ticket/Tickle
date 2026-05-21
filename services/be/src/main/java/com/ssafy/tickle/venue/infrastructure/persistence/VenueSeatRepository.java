package com.ssafy.tickle.venue.infrastructure.persistence;

import com.ssafy.tickle.venue.domain.VenueSeat;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 공연장 좌석 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface VenueSeatRepository extends JpaRepository<VenueSeat, Long> {

    @EntityGraph(attributePaths = {"section", "section.venue"})
    java.util.List<VenueSeat> findByVenueIdOrderBySection_DisplayOrderAscRowLabelAscSeatNumberAsc(Long venueId);

    @EntityGraph(attributePaths = {"section", "section.venue"})
    java.util.List<VenueSeat> findByIdIn(java.util.Collection<Long> venueSeatIds);
}
