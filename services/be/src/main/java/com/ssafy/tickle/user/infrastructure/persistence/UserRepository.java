package com.ssafy.tickle.user.infrastructure.persistence;

import com.ssafy.tickle.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 사용자 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * 사용자 식별자와 상태를 기준으로 존재 여부를 확인합니다.
     *
     * @param id     사용자 식별자
     * @param status 사용자 상태
     * @return 존재 여부
     */
    boolean existsByIdAndStatus(Long id, User.Status status);
}
