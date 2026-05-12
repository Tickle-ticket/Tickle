package com.ssafy.tickle.cancellation.infrastructure.persistence;

import com.ssafy.tickle.cancellation.domain.CancellationOffer;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
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

    /**
     * 특정 상태이고 만료 시각이 지난 제안 목록을 조회합니다.
     */
    java.util.List<CancellationOffer> findAllByOfferStatusAndOfferExpiresAtBefore(
            CancellationOffer.OfferStatus offerStatus,
            java.time.Instant now
    );

    /**
     * 특정 좌석에 대해 가장 최근(순번이 가장 높은) 제안을 조회합니다.
     */
    @Query("""
            select co from CancellationOffer co
            join co.cancellationCandidate cc
            where cc.sessionSeat.id = :sessionSeatId
            order by cc.waitingRank desc
            limit 1
            """)
    Optional<CancellationOffer> findLatestBySessionSeatId(@Param("sessionSeatId") Long sessionSeatId);

    /**
     * 예매 대기 신청별 취소표 제안 식별자를 조회합니다.
     */
    @Query("""
            select co.cancellationCandidate.id as candidateId, co.id as offerId
            from CancellationOffer co
            where co.cancellationCandidate.id in :candidateIds
            """)
    List<CandidateOfferIdProjection> findOfferIdsByCandidateIds(@Param("candidateIds") List<Long> candidateIds);

    /**
     * 특정 예매 대기 신청에 연결된 제안 존재 여부를 조회합니다.
     *
     * @param candidateId 예매 대기 후보 식별자
     * @return 제안 존재 여부
     */
    boolean existsByCancellationCandidateId(Long candidateId);

    interface CandidateOfferIdProjection {

        Long getCandidateId();
        Long getOfferId();
    }

    /**
     * 사용자가 유효한 미수락 제안을 받은 회차 좌석 식별자를 조회합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionSeatIds 회차 좌석 식별자 목록
     * @param offerStatus 제안 상태
     * @param now 현재 시각
     * @return 유효한 제안이 있는 회차 좌석 식별자 목록
     */
    @Query("""
            select co.cancellationCandidate.sessionSeat.id
            from CancellationOffer co
            where co.cancellationCandidate.user.id = :userId
              and co.cancellationCandidate.sessionSeat.id in :sessionSeatIds
              and co.offerStatus = :offerStatus
              and co.offerExpiresAt > :now
            """)
    List<Long> findActiveSessionSeatIdsByUserIdAndSessionSeatIds(
            @Param("userId") Long userId,
            @Param("sessionSeatIds") List<Long> sessionSeatIds,
            @Param("offerStatus") CancellationOffer.OfferStatus offerStatus,
            @Param("now") Instant now
    );
}
