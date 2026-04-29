package com.ssafy.tickle.payment.infrastructure.persistence;

import com.ssafy.tickle.payment.domain.Payment;
import com.ssafy.tickle.reservation.domain.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * 결제 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    /**
     * 예매를 함께 fetch join하여 결제를 조회합니다.
     *
     * @param paymentId 결제 식별자
     * @return 조회 결과
     */
    @Query("""
            select p from Payment p
            join fetch p.booking b
            join fetch b.user u
            join fetch b.session s
            where p.id = :paymentId
            """)
    Optional<Payment> findDetailById(@Param("paymentId") Long paymentId);

    /**
     * 예매별 결제 건을 조회합니다.
     *
     * @param bookingId 예매 식별자
     * @return 조회 결과
     */
    Optional<Payment> findByBookingId(Long bookingId);

    /**
     * 만료 대상이 될 수 있는 무통장 입금 대기 결제를 ID 순서로 배치 조회합니다.
     *
     * @param paymentStatus 결제 상태
     * @param paymentMethodType 결제 수단
     * @param bookingStatus 예매 상태
     * @param createdBefore 생성 시각 상한
     * @param paymentIdCursor 마지막으로 읽은 결제 ID
     * @param pageable 조회 크기
     * @return 조회 결과
     */
    @Query("""
            select p from Payment p
            join p.booking b
            where p.paymentStatus = :paymentStatus
              and p.paymentMethodType = :paymentMethodType
              and b.bookingStatus = :bookingStatus
              and p.createdAt < :createdBefore
              and p.id > :paymentIdCursor
            order by p.id asc
            """)
    List<Payment> findExpiredPendingBankTransferBatch(
            @Param("paymentStatus") Payment.Status paymentStatus,
            @Param("paymentMethodType") Payment.MethodType paymentMethodType,
            @Param("bookingStatus") Booking.Status bookingStatus,
            @Param("createdBefore") Instant createdBefore,
            @Param("paymentIdCursor") Long paymentIdCursor,
            Pageable pageable
    );
}
