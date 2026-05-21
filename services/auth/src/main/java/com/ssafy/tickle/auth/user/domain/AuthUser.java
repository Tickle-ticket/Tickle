package com.ssafy.tickle.auth.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

/**
 * 인증 서버에서 관리하는 사용자 도메인 엔티티입니다.
 *
 * <p>tickle_auth.users 테이블에 매핑되며, 인증에 필요한 최소 정보(이메일, 비밀번호, 권한)만 보유한다.
 * 프로필 정보(이름, 닉네임 등)는 tickle_core.users에서 관리한다.</p>
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_auth_users_oauth_provider_user",
                        columnNames = {"oauth_provider", "oauth_provider_user_id"}
                )
        }
)
public class AuthUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id", nullable = false, updatable = false)
    private Long id;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    // BCrypt 해시값 저장. OAuth 사용자는 비밀번호가 없다.
    @Column(name = "password", length = 255)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 30)
    private Role role;

    @Column(name = "phone_number", unique = true, length = 30)
    private String phoneNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "oauth_provider", nullable = false, length = 30)
    private OAuthProvider oauthProvider;

    @Column(name = "oauth_provider_user_id", length = 100)
    private String oauthProviderUserId;

    @Column(name = "organizer_id")
    private Long organizerId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * 사용자 권한 열거형입니다.
     */
    public enum Role {
        USER, ORGANIZER, ADMIN
    }

    /**
     * 인증 제공자 열거형입니다.
     */
    public enum OAuthProvider {
        LOCAL, KAKAO
    }

    /**
     * 신규 사용자를 생성합니다.
     *
     * @param email       이메일 (중복 불가)
     * @param password    BCrypt 해시된 비밀번호
     * @param role        사용자 권한
     * @param phoneNumber 전화번호 (중복 불가, OAuth 사용자는 null 가능)
     * @param oauthProvider OAuth 제공자
     * @param oauthProviderUserId OAuth 제공자 사용자 식별자
     * @param createdAt   생성 시각
     * @param updatedAt   수정 시각
     */
    @Builder
    public AuthUser(
            String email,
            String password,
            Role role,
            String phoneNumber,
            OAuthProvider oauthProvider,
            String oauthProviderUserId,
            Long organizerId,
            Instant createdAt,
            Instant updatedAt
    ) {
        this.email = email;
        this.password = password;
        this.role = role;
        this.phoneNumber = phoneNumber;
        this.oauthProvider = oauthProvider == null ? OAuthProvider.LOCAL : oauthProvider;
        this.oauthProviderUserId = oauthProviderUserId;
        this.organizerId = organizerId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    /**
     * 기획사 식별자를 업데이트합니다.
     *
     * @param organizerId 기획사 식별자
     */
    public void updateOrganizerId(Long organizerId) {
        this.organizerId = organizerId;
        this.updatedAt = Instant.now();
    }
}
