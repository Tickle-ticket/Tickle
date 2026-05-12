package com.ssafy.tickle.reservation.infrastructure.persistence;

import com.ssafy.tickle.reservation.domain.Booking;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * 예매 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface BookingRepository extends JpaRepository<Booking, Long> {

    /**
     * 동일 사용자/회차의 결제 대기 예매 목록을 최신순으로 조회합니다.
     *
     * @param userId        사용자 식별자
     * @param sessionId     회차 식별자
     * @param bookingStatus 예매 상태
     * @return 조회 결과
     */
    List<Booking> findAllByUserIdAndSessionIdAndBookingStatusOrderByIdDesc(
            Long userId,
            Long sessionId,
            Booking.Status bookingStatus
    );

    /**
     * 사용자가 특정 상태의 예매 내역을 가지고 있는지 확인합니다.
     *
     * @param userId 사용자 식별자
     * @param statuses 확인할 예매 상태 목록
     * @return 해당 상태의 예매 존재 여부
     */
    boolean existsByUserIdAndBookingStatusIn(Long userId, Collection<Booking.Status> statuses);

    /**
     * 사용자의 전체 예매 목록을 최신순으로 조회합니다.
     *
     * <p>N+1 방지를 위해 session → event → venue를 함께 로딩합니다.</p>
     *
     * @param userId 사용자 식별자
     * @return 예매 목록 (최신순)
     */
    @EntityGraph(attributePaths = {"session", "session.event", "session.event.venue"})
    @Query("SELECT b FROM Booking b WHERE b.user.id = :userId ORDER BY b.createdAt DESC")
    List<Booking> findAllByUserId(@Param("userId") Long userId);

    /**
     * 예매 ID와 사용자 ID로 예매를 조회합니다.
     *
     * <p>본인 소유 여부 검증에 사용됩니다.</p>
     *
     * @param bookingId 예매 식별자
     * @param userId    사용자 식별자
     * @return 예매 엔티티 (없으면 Optional.empty)
     */
    @EntityGraph(attributePaths = {"session", "session.event", "session.event.venue"})
    @Query("SELECT b FROM Booking b WHERE b.id = :bookingId AND b.user.id = :userId")
    Optional<Booking> findByIdAndUserId(
            @Param("bookingId") Long bookingId,
            @Param("userId") Long userId
    );
}
