package com.ssafy.tickle.auth.user.infrastructure.oauth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Kakao OAuth 연동에 필요한 설정값을 보관합니다.
 */
@Component
public class KakaoOAuthProperties {

    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;
    private final String scope;
    private final String authBaseUrl;

    public KakaoOAuthProperties(
            @Value("${kakao.oauth.client-id}") String clientId,
            @Value("${kakao.oauth.client-secret:}") String clientSecret,
            @Value("${kakao.oauth.redirect-uri}") String redirectUri,
            @Value("${kakao.oauth.scope:}") String scope,
            @Value("${kakao.oauth.auth-base-url}") String authBaseUrl
    ) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.scope = scope;
        this.authBaseUrl = authBaseUrl;
    }

    public String clientId() {
        return clientId;
    }

    public String clientSecret() {
        return clientSecret;
    }

    public String redirectUri() {
        return redirectUri;
    }

    public String scope() {
        return scope;
    }

    public String authBaseUrl() {
        return authBaseUrl;
    }

    public boolean hasClientSecret() {
        return clientSecret != null && !clientSecret.isBlank();
    }

    public boolean hasScope() {
        return scope != null && !scope.isBlank();
    }
}
