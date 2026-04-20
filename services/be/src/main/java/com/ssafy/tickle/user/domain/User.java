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

    // 사용자 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
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

    // 이름
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    // 생년월일
    @Column(name = "birth_date")
    private LocalDate birthDate;

    // 상태
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
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
     * @param userNo 사용자 번호
     * @param email 이메일
     * @param phoneNumber 전화번호
     * @param name 사용자명
     * @param birthDate 생년월일
     * @param status 사용자 상태
     * @param lastLoginAt 마지막 로그인 시각
     */
    @Builder
    public User(
            String userNo,
            String email,
            String phoneNumber,
            String name,
            LocalDate birthDate,
            Status status,
            Instant lastLoginAt
    ) {
        this.userNo = userNo;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.name = name;
        this.birthDate = birthDate;
        this.status = status;
        this.lastLoginAt = lastLoginAt;
    }
}
