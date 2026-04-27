package com.ssafy.tickle.user.presentation.dto;

import com.ssafy.tickle.user.domain.User;

import java.time.Instant;
import java.time.LocalDate;

/**
 * 내 정보 조회 응답 DTO입니다.
 *
 * @param userId 사용자 식별자
 * @param userNo 외부 노출 사용자 번호
 * @param email 이메일
 * @param phoneNumber 전화번호
 * @param name 실명
 * @param nickname 닉네임
 * @param profileImageUrl 프로필 이미지 URL
 * @param birthDate 생년월일
 * @param status 사용자 상태
 * @param lastLoginAt 마지막 로그인 시각
 * @param createdAt 생성 시각
 */
public record MyInfoResponse(
        Long userId,
        String userNo,
        String email,
        String phoneNumber,
        String name,
        String nickname,
        String profileImageUrl,
        LocalDate birthDate,
        User.Status status,
        Instant lastLoginAt,
        Instant createdAt
) {

    /**
     * 사용자 엔티티를 내 정보 조회 응답 DTO로 변환합니다.
     *
     * @param user 사용자 엔티티
     * @return 내 정보 응답
     */
    public static MyInfoResponse from(User user) {
        return new MyInfoResponse(
                user.getId(),
                user.getUserNo(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getName(),
                user.getNickname(),
                user.getProfileImageUrl(),
                user.getBirthDate(),
                user.getStatus(),
                user.getLastLoginAt(),
                user.getCreatedAt()
        );
    }
}
