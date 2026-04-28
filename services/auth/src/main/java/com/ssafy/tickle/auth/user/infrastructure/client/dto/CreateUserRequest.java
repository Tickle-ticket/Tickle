package com.ssafy.tickle.auth.user.infrastructure.client.dto;

/**
 * BE 서버 내부 사용자 생성 요청 DTO입니다.
 *
 * <p>회원가입 시 tickle_core.users 레코드 생성을 위해 Auth 서버가 BE 서버로 전달한다.</p>
 *
 * @param userId   사용자 식별자 (tickle_auth.users PK와 동일)
 * @param userNo   외부 노출용 사용자 번호 (예: TK-a1b2c3d4)
 * @param email    이메일
 * @param name     이름
 * @param nickname 닉네임
 */
public record CreateUserRequest(
        Long userId,
        String userNo,
        String email,
        String name,
        String nickname
) {
}
