package com.ssafy.tickle.ai.infrastructure.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * CAPTCHA 추가 검증 결과를 AI 서버에 전달하는 클라이언트입니다.
 */
@Slf4j
@Component
public class AiCaptchaVerificationResultClient {

    private static final String CAPTCHA_RESULT_PATH = "/api/captcha-retry-result";

    private final RestClient aiRestClient;

    public AiCaptchaVerificationResultClient(@Qualifier("aiRestClient") RestClient aiRestClient) {
        this.aiRestClient = aiRestClient;
    }

    /**
     * AI 서버에 CAPTCHA 추가 검증 결과를 전송합니다.
     *
     * <p>이 전송은 사용자의 CAPTCHA 처리 결과를 AI 서버 기록에 보강하기 위한 best-effort 호출입니다.
     * 실패하더라도 BE의 blacklist 해제/유지 흐름은 롤백하지 않습니다.</p>
     *
     * @param request AI 서버에 전달할 CAPTCHA 추가 검증 결과
     */
    public void send(AiCaptchaVerificationResultRequest request) {
        try {
            aiRestClient.post()
                    .uri(CAPTCHA_RESULT_PATH)
                    .body(request)
                    .retrieve()
                    .toBodilessEntity();
            log.info(
                    "AI 서버 CAPTCHA 추가 검증 결과 전송 성공: recordId={}, result={}, type={}, createdAt={}",
                    request.recordId(),
                    request.result(),
                    request.type(),
                    request.createdAt()
            );
        } catch (RestClientException exception) {
            log.info(
                    "AI 서버 CAPTCHA 추가 검증 결과 전송 실패: recordId={}, result={}, message={}",
                    request.recordId(),
                    request.result(),
                    exception.getMessage()
            );
        }
    }
}
