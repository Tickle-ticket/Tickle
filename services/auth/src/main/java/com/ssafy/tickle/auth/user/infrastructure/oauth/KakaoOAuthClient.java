package com.ssafy.tickle.auth.user.infrastructure.oauth;

import com.ssafy.tickle.auth.common.exception.BaseException;
import com.ssafy.tickle.auth.user.domain.AuthErrorCode;
import com.ssafy.tickle.auth.user.infrastructure.oauth.dto.KakaoTokenResponse;
import com.ssafy.tickle.auth.user.infrastructure.oauth.dto.KakaoUserInfoResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Kakao OAuth REST API 호출을 담당하는 클라이언트입니다.
 */
@Slf4j
@Component
public class KakaoOAuthClient {

    private static final String RESPONSE_TYPE_CODE = "code";
    private static final String AUTHORIZATION_CODE = "authorization_code";

    private final KakaoOAuthProperties properties;

    private final RestClient kakaoAuthRestClient;

    private final RestClient kakaoApiRestClient;

    public KakaoOAuthClient(
            KakaoOAuthProperties properties,
            @Qualifier("kakaoAuthRestClient") RestClient kakaoAuthRestClient,
            @Qualifier("kakaoApiRestClient") RestClient kakaoApiRestClient
    ) {
        this.properties = properties;
        this.kakaoAuthRestClient = kakaoAuthRestClient;
        this.kakaoApiRestClient = kakaoApiRestClient;
    }

    /**
     * Kakao 인가 코드 요청 URL을 생성합니다.
     *
     * @return Kakao authorize URL
     */
    public String buildAuthorizeUrl() {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(properties.authBaseUrl())
                .path("/oauth/authorize")
                .queryParam("response_type", RESPONSE_TYPE_CODE)
                .queryParam("client_id", properties.clientId())
                .queryParam("redirect_uri", properties.redirectUri());

        if (properties.hasScope()) {
            builder.queryParam("scope", properties.scope());
        }

        return builder
                .build()
                .encode()
                .toUriString();
    }

    /**
     * Kakao 인가 코드로 Kakao Access Token을 요청합니다.
     *
     * @param code Kakao authorization code
     * @return Kakao token response
     */
    public KakaoTokenResponse requestToken(String code) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", AUTHORIZATION_CODE);
        form.add("client_id", properties.clientId());
        form.add("redirect_uri", properties.redirectUri());
        form.add("code", code);
        if (properties.hasClientSecret()) {
            form.add("client_secret", properties.clientSecret());
        }

        try {
            return kakaoAuthRestClient.post()
                    .uri("/oauth/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(KakaoTokenResponse.class);
        } catch (Exception e) {
            log.warn("Kakao 토큰 요청 실패", e);
            throw new BaseException(AuthErrorCode.KAKAO_LOGIN_FAILED);
        }
    }

    /**
     * Kakao Access Token으로 사용자 정보를 조회합니다.
     *
     * @param accessToken Kakao Access Token
     * @return Kakao user info
     */
    public KakaoUserInfoResponse requestUserInfo(String accessToken) {
        try {
            return kakaoApiRestClient.get()
                    .uri("/v2/user/me")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(KakaoUserInfoResponse.class);
        } catch (Exception e) {
            log.warn("Kakao 사용자 정보 요청 실패", e);
            throw new BaseException(AuthErrorCode.KAKAO_LOGIN_FAILED);
        }
    }
}
