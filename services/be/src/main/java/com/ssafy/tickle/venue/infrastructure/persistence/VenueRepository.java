package com.ssafy.tickle.venue.infrastructure.persistence;

import com.ssafy.tickle.venue.domain.Venue;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 공연장 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface VenueRepository extends JpaRepository<Venue, Long> {
}
