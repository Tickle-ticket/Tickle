package com.ssafy.tickle.event.infrastructure.persistence;

import com.ssafy.tickle.event.domain.EventPricePolicy;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 이벤트 가격 정책 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface EventPricePolicyRepository extends JpaRepository<EventPricePolicy, Long> {
}
