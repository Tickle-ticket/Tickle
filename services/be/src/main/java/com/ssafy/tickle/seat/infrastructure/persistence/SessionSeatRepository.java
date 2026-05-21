package com.ssafy.tickle.seat.infrastructure.persistence;

import com.ssafy.tickle.seat.domain.SessionSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 회차별 좌석 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface SessionSeatRepository extends JpaRepository<SessionSeat, Long> {

    /**
     * 회차 ID 기준으로 좌석 전체를 fetch join하여 조회합니다.
     *
     * <p>EventSeat, EventSection, EventPricePolicy를 한 번에 로딩하여 N+1 문제를 방지합니다.</p>
     *
     * @param sessionId 회차 식별자
     * @return 좌석 목록 (구역 표시 순서 → 행 → 번호 오름차순)
     */
    @Query("""
            SELECT ss FROM SessionSeat ss
            JOIN FETCH ss.eventSeat es
            JOIN FETCH es.eventSection sec
            JOIN FETCH es.eventPricePolicy pp
            WHERE ss.session.id = :sessionId
            ORDER BY sec.displayOrder ASC, es.rowLabel ASC,
                     CAST(es.seatNumber AS integer) ASC
            """)
    List<SessionSeat> findBySessionIdWithDetails(@Param("sessionId") Long sessionId);

    /**
     * 좌석 ID 목록으로 SessionSeat을 일괄 조회합니다.
     *
     * <p>선점/해제 시 요청된 좌석들을 한 번의 쿼리로 조회합니다.</p>
     *
     * @param ids sessionSeat ID 목록
     * @return 조회된 SessionSeat 목록
     */
    @Query("SELECT ss FROM SessionSeat ss WHERE ss.id IN :ids")
    List<SessionSeat> findAllByIdIn(@Param("ids") List<Long> ids);

    /**
     * 좌석 선점을 단일 배치 UPDATE로 처리합니다.
     *
     * <p>AVAILABLE 상태인 좌석만 HELD로 전환합니다.
     * 반환된 업데이트 건수가 요청 건수와 다르면 이미 선점된 좌석이 포함된 것입니다.</p>
     *
     * @param ids    선점할 sessionSeatId 목록
     * @param userId 선점 사용자 식별자
     * @param now    선점 시각
     * @return 실제 HELD 전환된 좌석 수
     */
    @Modifying(clearAutomatically = true)
    @Query(value = """
            UPDATE session_seats
            SET sale_status = 'HELD', held_by_user_id = :userId,
                version_no = version_no + 1, updated_at = :now
            WHERE session_seat_id IN :ids AND sale_status = 'AVAILABLE'
            """, nativeQuery = true)
    int holdBatch(@Param("ids") List<Long> ids, @Param("userId") Long userId,
                  @Param("now") java.time.LocalDateTime now);

    /**
     * 회차와 좌석 ID 목록으로 가격 정책까지 함께 조회합니다.
     *
     * @param sessionId 회차 식별자
     * @param ids 좌석 식별자 목록
     * @return 가격 정책을 포함한 좌석 목록
     */
    @Query("""
            select ss from SessionSeat ss
            join fetch ss.eventSeat es
            join fetch es.eventPricePolicy pp
            where ss.session.id = :sessionId
              and ss.id in :ids
            order by ss.id asc
            """)
    List<SessionSeat> findAllWithPricePolicyBySessionIdAndIdIn(
            @Param("sessionId") Long sessionId,
            @Param("ids") List<Long> ids
    );

    /**
     * TTL 만료 이벤트 처리 시 userId + sessionId 기준으로 HELD 좌석을 조회합니다.
     *
     * <p>Redis 키 만료 후에는 값을 읽을 수 없으므로, 키 이름에서 파싱한
     * scheduleId와 userId로 DB를 직접 조회합니다.</p>
     *
     * @param sessionId    회차 식별자
     * @param heldByUserId 선점 사용자 식별자
     * @param saleStatus   조회할 상태 (HELD)
     * @return 해당 사용자가 선점 중인 SessionSeat 목록
     */
    @Query("SELECT ss FROM SessionSeat ss WHERE ss.session.id = :sessionId AND ss.heldByUserId = :heldByUserId AND ss.saleStatus = :saleStatus")
    List<SessionSeat> findAllBySessionIdAndHeldByUserIdAndSaleStatus(
            @Param("sessionId") Long sessionId,
            @Param("heldByUserId") Long heldByUserId,
            @Param("saleStatus") SessionSeat.SaleStatus saleStatus
    );

    /**
     * 사용자와 회차 기준으로 지정 좌석들이 HELD 상태인지 조회합니다.
     *
     * @param sessionId 회차 식별자
     * @param heldByUserId 선점 사용자 식별자
     * @param saleStatus 판매 상태
     * @param seatIds 좌석 식별자 목록
     * @return 조회된 좌석 목록
     */
    @Query("""
            select ss from SessionSeat ss
            where ss.session.id = :sessionId
              and ss.heldByUserId = :heldByUserId
              and ss.saleStatus = :saleStatus
              and ss.id in :seatIds
            """)
    List<SessionSeat> findAllBySessionIdAndHeldByUserIdAndSaleStatusAndIdIn(
            @Param("sessionId") Long sessionId,
            @Param("heldByUserId") Long heldByUserId,
            @Param("saleStatus") SessionSeat.SaleStatus saleStatus,
            @Param("seatIds") List<Long> seatIds
    );

    /**
     * 공연별 예매 확정 좌석 수를 집계합니다.
     *
     * @param eventIds 공연 식별자 목록
     * @param saleStatus 집계 대상 판매 상태
     * @return 공연별 확정 좌석 수
     */
    @Query("""
            select ss.session.event.id as eventId, count(ss.id) as confirmedSeatCount
            from SessionSeat ss
            where ss.session.event.id in :eventIds
              and ss.saleStatus = :saleStatus
            group by ss.session.event.id
            """)
    List<EventConfirmedSeatCountProjection> countConfirmedSeatsByEventIds(
            @Param("eventIds") List<Long> eventIds,
            @Param("saleStatus") SessionSeat.SaleStatus saleStatus
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from SessionSeat ss where ss.session.event.id = :eventId")
    void deleteByEventId(@Param("eventId") Long eventId);

    /**
     * HELD 상태이면서 {@code expiredBefore} 이전에 마지막으로 업데이트된 좌석을 조회합니다.
     *
     * <p>Redis Keyspace Notification이 유실된 경우 폴백으로 DB에서 직접 만료된 선점을 탐지합니다.
     * updatedAt은 hold() 호출 시 갱신되므로, 이 값이 HOLD_MINUTES를 초과하면 만료된 것으로 간주합니다.</p>
     *
     * @param expiredBefore 이 시각 이전에 업데이트된 HELD 좌석은 만료된 것으로 처리
     * @return 만료된 HELD 좌석 목록
     */
    @Query("""
            SELECT ss FROM SessionSeat ss
            JOIN FETCH ss.session s
            WHERE ss.saleStatus = com.ssafy.tickle.seat.domain.SessionSeat.SaleStatus.HELD
              AND ss.updatedAt < :expiredBefore
            """)
    List<SessionSeat> findExpiredHeldSeats(@Param("expiredBefore") java.time.Instant expiredBefore);

    /**
     * 공연별 예매 확정 좌석 수 조회 결과입니다.
     */
    interface EventConfirmedSeatCountProjection {

        /**
         * @return 공연 식별자
         */
        Long getEventId();

        /**
         * @return 예매 확정 좌석 수
         */
        long getConfirmedSeatCount();
    }
}
