package com.ssafy.tickle.auth.user.infrastructure.client;

import com.ssafy.tickle.auth.user.infrastructure.client.dto.CreateUserRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import com.ssafy.tickle.auth.user.infrastructure.client.dto.CreateUserResponse;
import com.ssafy.tickle.auth.common.response.BaseResponse;
import org.springframework.core.ParameterizedTypeReference;

/**
 * BE 서버 내부 API 클라이언트입니다.
 *
 * <p>회원가입 시 tickle_core.users 생성을 위해 BE 서버의 internal 엔드포인트를 호출한다.
 * VPC 내부 통신 전용이며, X-Internal-Secret 헤더로 인증한다.</p>
 */
@Slf4j
@Component
public class BeInternalClient {

    @Value("${internal.be.secret}")
    private String internalSecret;

    private final RestClient beRestClient;

    public BeInternalClient(@Qualifier("beRestClient") RestClient beRestClient) {
        this.beRestClient = beRestClient;
    }

    /**
     * BE 서버에 tickle_core.users 생성을 요청합니다.
     *
     * @param request 사용자 생성 요청 (userId, userNo, email, name, nickname)
     * @return 기획사 식별자 (있을 경우)
     * @throws RuntimeException BE 서버 호출 실패 시
     */
    public CreateUserResponse createUser(CreateUserRequest request) {
        log.info("BE 내부 사용자 생성 요청: userId={}", request.userId());
        BaseResponse<CreateUserResponse> response = beRestClient.post()
                .uri("/internal/v1/users")
                .header("X-Internal-Secret", internalSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(new ParameterizedTypeReference<BaseResponse<CreateUserResponse>>() {});

        return response != null ? response.data() : null;
    }
}
