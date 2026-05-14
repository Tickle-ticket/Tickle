package com.ssafy.tickle.blacklist.application;

import com.ssafy.tickle.ai.infrastructure.client.AiCaptchaVerificationResultClient;
import com.ssafy.tickle.ai.infrastructure.client.AiCaptchaVerificationResultRequest;
import com.ssafy.tickle.ai.presentation.dto.AiInferenceCallbackRequest.InferenceType;
import com.ssafy.tickle.blacklist.domain.BlacklistErrorCode;
import com.ssafy.tickle.blacklist.infrastructure.cache.BotDetectionCaptchaRecordStore;
import com.ssafy.tickle.blacklist.infrastructure.client.CloudflareTurnstileClient;
import com.ssafy.tickle.blacklist.infrastructure.sse.BotDetectionSseEmitterRepository;
import com.ssafy.tickle.blacklist.presentation.dto.CaptchaBlockMessage;
import com.ssafy.tickle.blacklist.presentation.dto.CaptchaVerificationRequest;
import com.ssafy.tickle.blacklist.presentation.dto.CaptchaVerificationResponse;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 봇 탐지 CAPTCHA SSE 연결과 검증 결과 처리를 담당합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BotDetectionCaptchaService {

    private final BotDetectionSseEmitterRepository sseEmitterRepository;
    private final CloudflareTurnstileClient cloudflareTurnstileClient;
    private final BlacklistService blacklistService;
    private final BotDetectionCaptchaRecordStore botDetectionCaptchaRecordStore;
    private final AiCaptchaVerificationResultClient aiCaptchaVerificationResultClient;

    /**
     * 사용자의 CAPTCHA 상태 SSE 연결을 등록합니다.
     *
     * @param userId JWT에서 추출한 사용자 식별자
     * @return CAPTCHA 상태를 push할 SSE emitter
     */
    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = sseEmitterRepository.add(userId);
        try {
            emitter.send(SseEmitter.event().comment("connected"));
            log.debug("[BotDetectionSSE] connected: userId={}", userId);
        } catch (Exception e) {
            log.warn(
                    "[BotDetectionSSE] connected failed: userId={}, type={}, message={}",
                    userId,
                    e.getClass().getSimpleName(),
                    e.getMessage()
            );
            sseEmitterRepository.remove(userId, emitter);
        }
        return emitter;
    }

    /**
     * 같은 사용자의 모든 SSE 연결에 CAPTCHA 재시도 요청을 전송합니다.
     *
     * @param userId   CAPTCHA 재검증 대상 사용자 식별자
     * @param recordId AI 서버의 1차 봇 판별 결과 식별자
     */
    public void sendRetryCaptcha(Long userId, String recordId) {
        sendCaptchaResult(userId, CaptchaBlockMessage.retryCaptcha(recordId));
    }

    /**
     * 같은 사용자의 모든 SSE 연결에 CAPTCHA 성공 종료 신호를 전송합니다.
     *
     * @param userId   CAPTCHA 검증 성공 사용자 식별자
     * @param recordId AI 서버의 1차 봇 판별 결과 식별자
     */
    public void sendSuccessClose(Long userId, String recordId) {
        sendCaptchaResult(userId, CaptchaBlockMessage.successClose(recordId));
    }

    /**
     * 같은 사용자의 모든 SSE 연결에 CAPTCHA 실패 종료 신호를 전송합니다.
     *
     * @param userId   CAPTCHA 검증 실패 사용자 식별자
     * @param recordId AI 서버의 1차 봇 판별 결과 식별자
     */
    public void sendDenyClose(Long userId, String recordId) {
        sendCaptchaResult(userId, CaptchaBlockMessage.denyClose(recordId));
    }

    /**
     * userId 기준으로 등록된 모든 SSE emitter에 CAPTCHA 상태 메시지를 전송합니다.
     *
     * @param userId  CAPTCHA 상태를 받을 사용자 식별자
     * @param message 전송할 CAPTCHA 상태 메시지
     */
    private void sendCaptchaResult(Long userId, CaptchaBlockMessage message) {
        List<SseEmitter> emitters = sseEmitterRepository.findByUserId(userId);
        log.info("[BotDetectionSSE] send captcha: userId={}, result={}, count={}", userId, message.result(), emitters.size());
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("captcha")
                        .data(message, MediaType.APPLICATION_JSON));
                log.debug("[BotDetectionSSE] send success: userId={}", userId);
            } catch (Exception e) {
                log.warn(
                        "[BotDetectionSSE] send failed: userId={}, type={}, message={}",
                        userId,
                        e.getClass().getSimpleName(),
                        e.getMessage()
                );
                sseEmitterRepository.remove(userId, emitter);
            }
        }
    }

    /**
     * FE가 전달한 CAPTCHA 결과를 검증하고 blacklist 상태와 AI 후속 결과를 반영합니다.
     *
     * @param userId   JWT에서 추출한 사용자 식별자
     * @param request  CAPTCHA 검증 요청
     * @param remoteIp Cloudflare Siteverify에 전달할 클라이언트 IP
     * @return CAPTCHA 검증 성공 응답
     */
    public CaptchaVerificationResponse verify(Long userId, CaptchaVerificationRequest request, String remoteIp) {
        validateCaptchaRetryRequest(request);
        validatePendingRecord(userId, request.recordId());

        // FE가 CAPTCHA 실패/취소를 명시한 경우 Cloudflare 검증 없이 차단 결과를 확정합니다.
        if (!request.success()) {
            sendBlockResult(userId, request);
            throw new BaseException(BlacklistErrorCode.CAPTCHA_VERIFICATION_FAILED);
        }

        // FE success 값만으로는 신뢰할 수 없으므로 Cloudflare 서버 검증을 반드시 수행합니다.
        boolean verified = cloudflareTurnstileClient.verify(request.token(), remoteIp);
        if (!verified) {
            sendBlockResult(userId, request);
            throw new BaseException(BlacklistErrorCode.CAPTCHA_VERIFICATION_FAILED);
        }

        // blacklist 삭제는 BlacklistService 내부 트랜잭션에서 처리하고, 외부 호출은 DB 트랜잭션 밖에서 수행합니다.
        blacklistService.removeBlacklistByUserId(userId);
        aiCaptchaVerificationResultClient.send(
                AiCaptchaVerificationResultRequest.allow(request.recordId())
        );
        botDetectionCaptchaRecordStore.delete(userId, request.recordId());
        sendSuccessClose(userId, request.recordId());
        log.info(
                "CAPTCHA 검증 성공 및 블랙리스트 해제: userId={}, recordId={}, type={}, eventId={}, scheduleId={}, eventDate={}, createdAt={}",
                userId,
                request.recordId(),
                request.type(),
                request.eventId(),
                request.scheduleId(),
                request.eventDate(),
                request.createdAt()
        );
        return CaptchaVerificationResponse.successClose();
    }

    /**
     * CAPTCHA 후속 검증 요청 type이 현재 지원하는 고정값인지 확인합니다.
     *
     * @param request CAPTCHA 검증 요청
     */
    private void validateCaptchaRetryRequest(CaptchaVerificationRequest request) {
        if (request.type() != InferenceType.CAPTCHA_RETRY) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "type은 CAPTCHA_RETRY만 사용할 수 있습니다.");
        }
    }

    /**
     * FE가 보낸 recordId가 해당 사용자에게 발급된 pending CAPTCHA 요청인지 확인합니다.
     *
     * @param userId   JWT에서 추출한 사용자 식별자
     * @param recordId FE가 CAPTCHA 검증 요청에 포함한 recordId
     */
    private void validatePendingRecord(Long userId, String recordId) {
        if (!botDetectionCaptchaRecordStore.exists(userId, recordId)) {
            throw new BaseException(BlacklistErrorCode.CAPTCHA_RECORD_NOT_FOUND);
        }
    }

    /**
     * CAPTCHA 실패 결과를 AI 서버와 FE SSE에 반영하고 pending record를 정리합니다.
     *
     * @param userId  CAPTCHA 검증 실패 사용자 식별자
     * @param request CAPTCHA 검증 요청
     */
    private void sendBlockResult(Long userId, CaptchaVerificationRequest request) {
        aiCaptchaVerificationResultClient.send(
                AiCaptchaVerificationResultRequest.block(request.recordId())
        );
        botDetectionCaptchaRecordStore.delete(userId, request.recordId());
        sendDenyClose(userId, request.recordId());
    }
}
