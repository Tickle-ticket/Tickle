package com.ssafy.tickle.payment.infrastructure.persistence;

import com.ssafy.tickle.payment.domain.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 결제 거래 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
}
