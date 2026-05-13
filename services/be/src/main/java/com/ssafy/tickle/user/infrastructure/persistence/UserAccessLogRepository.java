package com.ssafy.tickle.user.infrastructure.persistence;

import com.ssafy.tickle.user.domain.UserAccessLog;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 사용자 접속 로그 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface UserAccessLogRepository extends JpaRepository<UserAccessLog, Long> {
    long countByCreatedAtBetween(java.time.Instant start, java.time.Instant end);
}
