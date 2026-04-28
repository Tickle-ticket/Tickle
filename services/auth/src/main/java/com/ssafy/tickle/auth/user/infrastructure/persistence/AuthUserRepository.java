package com.ssafy.tickle.auth.user.infrastructure.persistence;

import com.ssafy.tickle.auth.user.domain.AuthUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * AuthUser JPA 레포지토리입니다.
 */
public interface AuthUserRepository extends JpaRepository<AuthUser, Long> {

    /**
     * 이메일로 사용자를 조회합니다.
     *
     * @param email 이메일
     * @return AuthUser (없으면 Optional.empty)
     */
    Optional<AuthUser> findByEmail(String email);

    /**
     * 이메일 중복 여부를 확인합니다.
     *
     * @param email 이메일
     * @return 존재 여부
     */
    boolean existsByEmail(String email);
}
