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
