package com.ssafy.tickle.auth.user.infrastructure.oauth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Kakao 사용자 정보 응답 DTO입니다.
 *
 * @param id Kakao 앱 연결 사용자 식별자
 * @param kakaoAccount Kakao 계정 정보
 * @param properties Kakao 사용자 속성
 */
public record KakaoUserInfoResponse(
        Long id,

        @JsonProperty("kakao_account")
        KakaoAccount kakaoAccount,

        Properties properties
) {

    /**
     * 서비스 가입에 사용할 이메일을 반환합니다.
     *
     * @return Kakao 계정 이메일
     */
    public String email() {
        return kakaoAccount == null ? null : kakaoAccount.email();
    }

    /**
     * 서비스 가입에 사용할 닉네임을 반환합니다.
     *
     * @return Kakao 프로필 닉네임
     */
    public String nickname() {
        if (kakaoAccount != null && kakaoAccount.profile() != null && kakaoAccount.profile().nickname() != null) {
            return kakaoAccount.profile().nickname();
        }
        return properties == null ? null : properties.nickname();
    }

    /**
     * Kakao 계정 정보 DTO입니다.
     *
     * @param email 이메일
     * @param profile 프로필
     */
    public record KakaoAccount(
            String email,
            Profile profile
    ) {
    }

    /**
     * Kakao 프로필 DTO입니다.
     *
     * @param nickname 닉네임
     * @param profileImageUrl 프로필 이미지 URL
     */
    public record Profile(
            String nickname,

            @JsonProperty("profile_image_url")
            String profileImageUrl
    ) {
    }

    /**
     * Kakao 사용자 속성 DTO입니다.
     *
     * @param nickname 닉네임
     * @param profileImage 프로필 이미지 URL
     */
    public record Properties(
            String nickname,

            @JsonProperty("profile_image")
            String profileImage
    ) {
    }
}
