package com.ssafy.tickle.blacklist.presentation.dto;

import com.ssafy.tickle.blacklist.domain.Blacklist;

import java.time.Instant;

/**
 * 블랙리스트 항목 응답 DTO입니다.
 *
 * @param blacklistId 블랙리스트 식별자
 * @param userId      블랙리스트 대상 사용자 식별자
 * @param userName    블랙리스트 대상 사용자 실명 (탈퇴 등으로 조회 불가 시 null)
 * @param reason      등록 사유 (enum 이름)
 * @param detail      상세 설명 (nullable)
 * @param blockedBy   등록 관리자 ID (자동 탐지 시 null)
 * @param createdAt   등록 시각
 */
public record BlacklistResponse(
        Long blacklistId,
        Long userId,
        String userName,
        String reason,
        String detail,
        Long blockedBy,
        Instant createdAt
) {

    /**
     * 블랙리스트 엔티티와 사용자 이름으로 응답 DTO를 생성합니다.
     *
     * @param blacklist 블랙리스트 엔티티
     * @param userName  사용자 실명 (조회 불가 시 null)
     * @return 블랙리스트 응답 DTO
     */
    public static BlacklistResponse of(Blacklist blacklist, String userName) {
        return new BlacklistResponse(
                blacklist.getId(),
                blacklist.getUserId(),
                userName,
                blacklist.getReason().name(),
                blacklist.getDetail(),
                blacklist.getBlockedBy(),
                blacklist.getCreatedAt()
        );
    }
}
