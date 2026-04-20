package com.ssafy.tickle.event.infrastructure.persistence;

import com.ssafy.tickle.event.domain.Organizer;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 주최자 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface OrganizerRepository extends JpaRepository<Organizer, Long> {
}
