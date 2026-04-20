package com.ssafy.tickle.payment.infrastructure.persistence;

import com.ssafy.tickle.payment.domain.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 결제 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface PaymentRepository extends JpaRepository<Payment, Long> {
}
