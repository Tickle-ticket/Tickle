package com.ssafy.tickle.seat.infrastructure.persistence;

import com.ssafy.tickle.seat.domain.EventSection;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 이벤트 구역 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface EventSectionRepository extends JpaRepository<EventSection, Long> {
}
