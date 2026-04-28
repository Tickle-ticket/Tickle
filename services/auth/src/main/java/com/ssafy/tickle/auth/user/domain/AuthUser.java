package com.ssafy.tickle.auth.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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
@Table(name = "users")
public class AuthUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id", nullable = false, updatable = false)
    private Long id;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    // BCrypt 해시값 저장
    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 30)
    private Role role;

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
     * 신규 사용자를 생성합니다.
     *
     * @param email     이메일 (중복 불가)
     * @param password  BCrypt 해시된 비밀번호
     * @param role      사용자 권한
     * @param createdAt 생성 시각
     * @param updatedAt 수정 시각
     */
    @Builder
    public AuthUser(String email, String password, Role role, Instant createdAt, Instant updatedAt) {
        this.email = email;
        this.password = password;
        this.role = role;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
