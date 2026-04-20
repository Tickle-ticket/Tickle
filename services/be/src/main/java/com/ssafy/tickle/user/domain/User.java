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

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id", nullable = false, updatable = false)
    private Long id;

    @Column(name = "user_no", nullable = false, length = 50)
    private String userNo;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "phone_number", length = 30)
    private String phoneNumber;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private Status status;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

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
