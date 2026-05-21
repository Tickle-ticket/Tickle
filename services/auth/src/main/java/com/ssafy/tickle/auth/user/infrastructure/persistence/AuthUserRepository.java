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
     * OAuth 제공자와 제공자 사용자 식별자로 사용자를 조회합니다.
     *
     * @param oauthProvider OAuth 제공자
     * @param oauthProviderUserId OAuth 제공자 사용자 식별자
     * @return AuthUser (없으면 Optional.empty)
     */
    Optional<AuthUser> findByOauthProviderAndOauthProviderUserId(
            AuthUser.OAuthProvider oauthProvider,
            String oauthProviderUserId
    );

    /**
     * 이메일 중복 여부를 확인합니다.
     *
     * @param email 이메일
     * @return 존재 여부
     */
    boolean existsByEmail(String email);

    /**
     * 전화번호 중복 여부를 확인합니다.
     *
     * @param phoneNumber 전화번호
     * @return 존재 여부
     */
    boolean existsByPhoneNumber(String phoneNumber);
}
