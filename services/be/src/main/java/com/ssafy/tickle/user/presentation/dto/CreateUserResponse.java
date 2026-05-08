package com.ssafy.tickle.user.presentation.dto;

/**
 * 내부 사용자 생성 응답 DTO입니다.
 *
 * @param organizerId 생성된 또는 연결된 기획사 식별자 (기획사 권한일 경우만 존재)
 */
public record CreateUserResponse(
        Long organizerId
) {
}
