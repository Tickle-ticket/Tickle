package com.ssafy.tickle.reservation.infrastructure.persistence;

import com.ssafy.tickle.reservation.domain.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * 예매 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface BookingRepository extends JpaRepository<Booking, Long> {

    /**
     * 동일 사용자/회차의 결제 대기 예매 목록을 최신순으로 조회합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionId 회차 식별자
     * @param bookingStatus 예매 상태
     * @return 조회 결과
     */
    List<Booking> findAllByUserIdAndSessionIdAndBookingStatusOrderByIdDesc(
            Long userId,
            Long sessionId,
            Booking.Status bookingStatus
    );
}
