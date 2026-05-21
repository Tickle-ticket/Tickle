package com.ssafy.tickle.user.infrastructure.client;

import com.ssafy.tickle.common.response.BaseResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Auth 서버 내부 API 클라이언트입니다.
 */
@Slf4j
@Component
public class AuthInternalClient {

    @Value("${internal.auth.secret}")
    private String internalSecret;

    private final RestClient authRestClient;

    public AuthInternalClient(@Qualifier("authRestClient") RestClient authRestClient) {
        this.authRestClient = authRestClient;
    }

    /**
     * Auth 서버에 사용자 삭제를 요청합니다.
     *
     * @param userId 삭제할 사용자 식별자
     */
    public void deleteUser(Long userId) {
        log.info("Auth 서버 사용자 삭제 요청: userId={}", userId);
        try {
            authRestClient.delete()
                    .uri("/internal/v1/auth/users/{userId}", userId)
                    .header("X-Internal-Secret", internalSecret)
                    .retrieve()
                    .body(new ParameterizedTypeReference<BaseResponse<Void>>() {});
        } catch (org.springframework.web.client.RestClientResponseException e) {
            if (e.getStatusCode().value() == 404) {
                log.info("Auth 서버에 해당 사용자가 존재하지 않아 삭제를 생략합니다: userId={}", userId);
            } else {
                log.warn("Auth 서버 사용자 삭제 실패 (HTTP {}): userId={}, msg={}", e.getStatusCode(), userId, e.getMessage());
                throw e;
            }
        }
    }
}
