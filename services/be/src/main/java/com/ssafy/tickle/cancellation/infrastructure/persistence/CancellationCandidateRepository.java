package com.ssafy.tickle.cancellation.infrastructure.persistence;

import com.ssafy.tickle.cancellation.domain.CancellationCandidate;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 취소 대기 후보 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface CancellationCandidateRepository extends JpaRepository<CancellationCandidate, Long> {
}
