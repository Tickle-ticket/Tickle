package com.ssafy.tickle.cancellation.infrastructure.persistence;

import com.ssafy.tickle.cancellation.domain.CancellationOffer;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 취소 제안 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface CancellationOfferRepository extends JpaRepository<CancellationOffer, Long> {
}
