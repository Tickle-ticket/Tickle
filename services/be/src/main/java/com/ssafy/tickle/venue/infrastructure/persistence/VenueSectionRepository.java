package com.ssafy.tickle.venue.infrastructure.persistence;

import com.ssafy.tickle.venue.domain.VenueSection;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 공연장 구역 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface VenueSectionRepository extends JpaRepository<VenueSection, Long> {

    java.util.List<VenueSection> findByVenue_IdOrderByDisplayOrderAsc(Long venueId);
}
