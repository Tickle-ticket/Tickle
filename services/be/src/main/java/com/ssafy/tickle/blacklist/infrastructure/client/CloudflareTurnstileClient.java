package com.ssafy.tickle.blacklist.infrastructure.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;

/**
 * Cloudflare Turnstile Siteverify API 클라이언트입니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CloudflareTurnstileClient {

    private static final String SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    @Value("${cloudflare.turnstile.secret-key}")
    private String secretKey;

    public boolean verify(String token, String remoteIp) {
        LinkedMultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("secret", secretKey);
        body.add("response", token);
        if (remoteIp != null && !remoteIp.isBlank()) {
            body.add("remoteip", remoteIp);
        }

        try {
            SiteverifyResponse response = RestClient.create()
                    .post()
                    .uri(SITEVERIFY_URL)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(body)
                    .retrieve()
                    .body(SiteverifyResponse.class);

            if (response == null) {
                log.warn("Cloudflare Turnstile 검증 응답이 비어있습니다.");
                return false;
            }
            if (!response.success()) {
                log.warn("Cloudflare Turnstile 검증 실패: errorCodes={}", response.errorCodes());
            }
            return response.success();
        } catch (RestClientException e) {
            log.warn("Cloudflare Turnstile 검증 요청 실패: {}", e.getMessage());
            return false;
        }
    }

    private record SiteverifyResponse(
            boolean success,
            @JsonProperty("error-codes")
            List<String> errorCodes
    ) {
    }
}
