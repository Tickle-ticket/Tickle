package com.ssafy.tickle.event.infrastructure.persistence;

import com.ssafy.tickle.event.domain.EventPricePolicy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 이벤트 가격 정책 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface EventPricePolicyRepository extends JpaRepository<EventPricePolicy, Long> {

    /**
     * 특정 이벤트에 가격 정책이 하나라도 등록되어 있는지 확인합니다.
     *
     * @param eventId 이벤트 식별자
     * @return 가격 정책 존재 여부
     */
    boolean existsByEventId(Long eventId);

    /**
     * 이벤트 가격 정책을 노출 순서대로 조회합니다.
     *
     * @param eventId 이벤트 식별자
     * @return 가격 정책 목록
     */
    List<EventPricePolicy> findByEventIdOrderByDisplayOrderAsc(Long eventId);
}
