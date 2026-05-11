package com.ssafy.tickle.user.domain;

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
import java.time.LocalDate;

import static lombok.AccessLevel.PROTECTED;

/**
 * 서비스 회원 정보를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "users")
public class User {

    // 사용자 PK (Auth 서버가 발급한 ID를 그대로 사용 - AUTO_INCREMENT 없음)
    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private Long id;

    // 외부 노출 사용자 번호
    @Column(name = "user_no", nullable = false, length = 50)
    private String userNo;

    // 이메일
    @Column(name = "email", length = 255)
    private String email;

    // 전화번호
    @Column(name = "phone_number", length = 30)
    private String phoneNumber;

    // 실명
    @Column(name = "name", nullable = false, length = 30)
    private String name;

    // 닉네임
    @Column(name = "nickname", length = 50)
    private String nickname;

    // 프로필 이미지 URL
    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    // 생년월일
    @Column(name = "birth_date")
    private LocalDate birthDate;

    // 기획사 식별자 (ORGANIZER 권한일 경우 필수)
    @Column(name = "organizer_id")
    private Long organizerId;

    // 권한
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 30, columnDefinition = "varchar(30)")
    private UserRole role;

    // 상태
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30, columnDefinition = "varchar(30)")
    private Status status;

    // 마지막 로그인 시각
    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    // 생성 시각
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // 수정 시각
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum Status {
        ACTIVE,
        INACTIVE,
        SUSPENDED,
        DELETED
    }

    /**
     * 사용자 엔티티를 생성합니다.
     *
     * <p>id / createdAt / updatedAt은 일반적으로 DB/JPA 자동 생성이지만,
     * 내부 API를 통한 생성 또는 테스트 목적으로 명시 지정도 허용합니다.</p>
     *
     * @param id              사용자 PK (null 시 DB auto-increment)
     * @param userNo          사용자 번호
     * @param email           이메일
     * @param phoneNumber     전화번호
     * @param name            실명
     * @param nickname        닉네임
     * @param profileImageUrl 프로필 이미지 URL
     * @param birthDate       생년월일
     * @param organizerId     기획사 식별자
     * @param role            사용자 권한
     * @param status          사용자 상태
     * @param lastLoginAt     마지막 로그인 시각
     * @param createdAt       생성 시각 (null 시 Instant.now())
     * @param updatedAt       수정 시각 (null 시 Instant.now())
     */
    @Builder
    public User(
            Long id,
            String userNo,
            String email,
            String phoneNumber,
            String name,
            String nickname,
            String profileImageUrl,
            LocalDate birthDate,
            Long organizerId,
            UserRole role,
            Status status,
            Instant lastLoginAt,
            Instant createdAt,
            Instant updatedAt
    ) {
        this.id = id;
        this.userNo = userNo;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.name = name;
        this.nickname = nickname;
        this.profileImageUrl = profileImageUrl;
        this.birthDate = birthDate;
        this.organizerId = organizerId;
        this.role = role;
        this.status = status;
        this.lastLoginAt = lastLoginAt;
        this.createdAt = (createdAt != null) ? createdAt : Instant.now();
        this.updatedAt = (updatedAt != null) ? updatedAt : Instant.now();
    }

    /**
     * 전달된 값만 반영하여 사용자 프로필을 수정합니다.
     *
     * @param phoneNumber 전화번호
     * @param nickname 닉네임
     * @param profileImageUrl 프로필 이미지 URL
     */
    public void updateProfile(
            String phoneNumber,
            String nickname,
            String profileImageUrl
    ) {
        if (phoneNumber != null) {
            this.phoneNumber = phoneNumber;
        }
        if (nickname != null) {
            this.nickname = nickname;
        }
        if (profileImageUrl != null) {
            this.profileImageUrl = profileImageUrl;
        }
        this.updatedAt = Instant.now();
    }

}
