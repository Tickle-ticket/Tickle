package com.ssafy.tickle.cancellation.infrastructure.persistence;

import com.ssafy.tickle.cancellation.domain.CancellationCandidate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

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
        return findSessionSeatIdsByUserIdAndSessionSeatIdsAndStatus(
                userId,
                sessionSeatIds,
                CancellationCandidate.Status.WAITING
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
