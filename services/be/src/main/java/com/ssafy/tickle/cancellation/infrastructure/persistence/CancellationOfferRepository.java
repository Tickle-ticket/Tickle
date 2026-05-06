package com.ssafy.tickle.cancellation.infrastructure.persistence;

import com.ssafy.tickle.cancellation.domain.CancellationOffer;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/**
 * 취소 제안 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface CancellationOfferRepository extends JpaRepository<CancellationOffer, Long> {

    /**
     * 취소표 제안, 대기 후보, 사용자, 좌석 정보를 함께 조회합니다.
     *
     * @param id 제안 식별자
     * @return 조회된 제안 객체
     */
    @Query("""
            select co from CancellationOffer co
            join fetch co.cancellationCandidate cc
            join fetch cc.user u
            join fetch cc.sessionSeat ss
            join fetch ss.session s
            join fetch ss.eventSeat es
            join fetch es.eventPricePolicy epp
            where co.id = :id
            """)
    Optional<CancellationOffer> findByIdWithDetails(@Param("id") Long id);
}
