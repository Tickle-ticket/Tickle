package com.ssafy.tickle.cancellation.infrastructure.persistence;

import com.ssafy.tickle.cancellation.domain.CancellationCandidate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * 취소 대기 후보 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface CancellationCandidateRepository extends JpaRepository<CancellationCandidate, Long> {

    /**
     * 좌석별 활성 예매 대기 인원 수를 조회합니다.
     *
     * @param sessionSeatIds 회차 좌석 식별자 목록
     * @return 좌석별 대기 인원 수
     */
    default List<WaitingCountProjection> countActiveBySessionSeatIds(List<Long> sessionSeatIds) {
        return countBySessionSeatIdsAndStatus(sessionSeatIds, CancellationCandidate.Status.WAITING);
    }

    /**
     * 사용자가 이미 활성 예매 대기 신청한 좌석 식별자를 조회합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionSeatIds 회차 좌석 식별자 목록
     * @return 이미 신청한 회차 좌석 식별자 목록
     */
    default List<Long> findActiveSessionSeatIdsByUserIdAndSessionSeatIds(
            Long userId,
            List<Long> sessionSeatIds
    ) {
        return findSessionSeatIdsByUserIdAndSessionSeatIdsAndStatuses(
                userId,
                sessionSeatIds,
                List.of(CancellationCandidate.Status.WAITING, CancellationCandidate.Status.OFFERED)
        );
    }

    /**
     * 사용자와 회차 기준 활성 예매 대기 신청 수를 조회합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionId 회차 식별자
     * @return 활성 예매 대기 신청 수
     */
    default long countActiveByUserIdAndSessionId(Long userId, Long sessionId) {
        return countByUserIdAndSessionIdAndStatuses(
                userId,
                sessionId,
                List.of(CancellationCandidate.Status.WAITING, CancellationCandidate.Status.OFFERED)
        );
    }

    /**
     * 좌석별 특정 상태의 예매 대기 인원 수를 조회합니다.
     *
     * @param sessionSeatIds 회차 좌석 식별자 목록
     * @param status 조회할 대기 후보 상태
     * @return 좌석별 대기 인원 수
     */
    @Query("""
            select c.sessionSeat.id as sessionSeatId, count(c.id) as waitingCount
            from CancellationCandidate c
            where c.sessionSeat.id in :sessionSeatIds
              and c.status = :status
            group by c.sessionSeat.id
            """)
    List<WaitingCountProjection> countBySessionSeatIdsAndStatus(
            @Param("sessionSeatIds") List<Long> sessionSeatIds,
            @Param("status") CancellationCandidate.Status status
    );

    /**
     * 사용자와 회차 기준 특정 상태의 예매 대기 신청 수를 조회합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionId 회차 식별자
     * @param status 조회할 대기 후보 상태
     * @return 조건에 맞는 예매 대기 신청 수
     */
    @Query("""
            select count(c.id)
            from CancellationCandidate c
            where c.user.id = :userId
              and c.sessionSeat.session.id = :sessionId
              and c.status = :status
            """)
    long countByUserIdAndSessionIdAndStatus(
            @Param("userId") Long userId,
            @Param("sessionId") Long sessionId,
            @Param("status") CancellationCandidate.Status status
    );

    /**
     * 사용자와 회차 기준 특정 상태들의 예매 대기 신청 수를 조회합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionId 회차 식별자
     * @param statuses 조회할 대기 후보 상태 목록
     * @return 조건에 맞는 예매 대기 신청 수
     */
    @Query("""
            select count(c.id)
            from CancellationCandidate c
            where c.user.id = :userId
              and c.sessionSeat.session.id = :sessionId
              and c.status in :statuses
            """)
    long countByUserIdAndSessionIdAndStatuses(
            @Param("userId") Long userId,
            @Param("sessionId") Long sessionId,
            @Param("statuses") List<CancellationCandidate.Status> statuses
    );

    /**
     * 사용자가 특정 상태로 신청한 좌석 식별자를 조회합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionSeatIds 회차 좌석 식별자 목록
     * @param status 조회할 대기 후보 상태
     * @return 신청된 회차 좌석 식별자 목록
     */
    @Query("""
            select c.sessionSeat.id
            from CancellationCandidate c
            where c.user.id = :userId
              and c.sessionSeat.id in :sessionSeatIds
              and c.status = :status
            """)
    List<Long> findSessionSeatIdsByUserIdAndSessionSeatIdsAndStatus(
            @Param("userId") Long userId,
            @Param("sessionSeatIds") List<Long> sessionSeatIds,
            @Param("status") CancellationCandidate.Status status
    );

    /**
     * 사용자가 특정 상태들로 신청한 좌석 식별자를 조회합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionSeatIds 회차 좌석 식별자 목록
     * @param statuses 조회할 대기 후보 상태 목록
     * @return 신청된 회차 좌석 식별자 목록
     */
    @Query("""
            select c.sessionSeat.id
            from CancellationCandidate c
            where c.user.id = :userId
              and c.sessionSeat.id in :sessionSeatIds
              and c.status in :statuses
            """)
    List<Long> findSessionSeatIdsByUserIdAndSessionSeatIdsAndStatuses(
            @Param("userId") Long userId,
            @Param("sessionSeatIds") List<Long> sessionSeatIds,
            @Param("statuses") List<CancellationCandidate.Status> statuses
    );

    /**
     * 좌석별 마지막 대기 순번을 조회합니다.
     *
     * @param sessionSeatId 회차 좌석 식별자
     * @return 마지막 대기 순번, 없으면 null
     */
    @Query("""
            select max(c.waitingRank)
            from CancellationCandidate c
            where c.sessionSeat.id = :sessionSeatId
            """)
    Integer findMaxWaitingRankBySessionSeatId(@Param("sessionSeatId") Long sessionSeatId);

    /**
     * 특정 좌석에 대해 특정 순번보다 큰 첫 번째 대기자를 조회합니다.
     */
    Optional<CancellationCandidate> findFirstBySessionSeatIdAndStatusAndWaitingRankGreaterThanOrderByWaitingRankAsc(
            Long sessionSeatId,
            CancellationCandidate.Status status,
            Integer waitingRank
    );

    /**
     * 특정 좌석에 대해 가장 낮은 순번(1번 등)의 대기자를 조회합니다.
     */
    Optional<CancellationCandidate> findFirstBySessionSeatIdAndStatusOrderByWaitingRankAsc(
            Long sessionSeatId,
            CancellationCandidate.Status status
    );

    /**
     * 사용자의 예매 대기 신청 목록을 상세 정보와 함께 조회합니다.
     *
     * @param userId 사용자 식별자
     * @param statuses 조회할 대기 후보 상태 목록
     * @return 예매 대기 신청 목록
     */
    @Query("""
            select c from CancellationCandidate c
            join fetch c.sessionSeat ss
            join fetch ss.session s
            join fetch s.event e
            join fetch ss.eventSeat es
            join fetch es.eventSection sec
            where c.user.id = :userId
              and c.status in :statuses
            order by c.createdAt desc
            """)
    List<CancellationCandidate> findAllByUserIdAndStatusesWithDetails(
            @Param("userId") Long userId,
            @Param("statuses") List<CancellationCandidate.Status> statuses
    );

    /**
     * 예매 대기 신청을 상세 정보와 함께 조회합니다.
     *
     * @param candidateId 예매 대기 후보 식별자
     * @return 예매 대기 후보
     */
    @Query("""
            select c from CancellationCandidate c
            join fetch c.user u
            join fetch c.sessionSeat ss
            join fetch ss.session s
            join fetch ss.eventSeat es
            where c.id = :candidateId
            """)
    Optional<CancellationCandidate> findByIdWithDetails(@Param("candidateId") Long candidateId);

    /**
     * 같은 좌석에서 특정 순번보다 앞에 남아있는 활성 대기자 수를 조회합니다.
     *
     * @param sessionSeatId 회차 좌석 식별자
     * @param waitingRank 기준 대기 순번
     * @param status 조회할 대기 후보 상태
     * @return 앞 순번 활성 대기자 수
     */
    @Query("""
            select count(c.id)
            from CancellationCandidate c
            where c.sessionSeat.id = :sessionSeatId
              and c.waitingRank < :waitingRank
              and c.status = :status
            """)
    long countBeforeRankBySessionSeatIdAndStatus(
            @Param("sessionSeatId") Long sessionSeatId,
            @Param("waitingRank") Integer waitingRank,
            @Param("status") CancellationCandidate.Status status
    );

    /**
     * 좌석별 활성 예매 대기 인원 수 조회 결과입니다.
     */
    interface WaitingCountProjection {

        /**
         * @return 회차 좌석 식별자
         */
        Long getSessionSeatId();

        /**
         * @return 해당 좌석의 활성 예매 대기 인원 수
         */
        long getWaitingCount();
    }
}
