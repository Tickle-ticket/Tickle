package com.ssafy.tickle.payment.infrastructure.persistence;

import com.ssafy.tickle.payment.domain.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 결제 거래 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    /**
     * 동일한 외부 이벤트 식별자가 이미 처리되었는지 확인합니다.
     *
     * @param providerEventId 외부 이벤트 식별자
     * @return 존재 여부
     */
    boolean existsByProviderEventId(String providerEventId);

    /**
     * 결제별 거래 이력을 생성 순으로 조회합니다.
     *
     * @param paymentId 결제 식별자
     * @return 거래 이력 목록
     */
    List<PaymentTransaction> findByPaymentIdOrderByCreatedAtAsc(Long paymentId);
}
