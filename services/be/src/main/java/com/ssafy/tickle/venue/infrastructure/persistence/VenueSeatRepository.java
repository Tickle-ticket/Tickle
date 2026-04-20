package com.ssafy.tickle.venue.infrastructure.persistence;

import com.ssafy.tickle.venue.domain.VenueSeat;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 공연장 좌석 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface VenueSeatRepository extends JpaRepository<VenueSeat, Long> {
}
