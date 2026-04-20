package com.ssafy.tickle.user.infrastructure.persistence;

import com.ssafy.tickle.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 사용자 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface UserRepository extends JpaRepository<User, Long> {
}
