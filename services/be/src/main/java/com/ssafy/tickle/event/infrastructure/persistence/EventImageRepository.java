package com.ssafy.tickle.event.infrastructure.persistence;

import com.ssafy.tickle.event.domain.EventImage;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 이벤트 이미지 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface EventImageRepository extends JpaRepository<EventImage, Long> {
}
