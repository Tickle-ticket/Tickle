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
import java.io.IOException;
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

    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = sseEmitterRepository.add(userId);
        try {
            emitter.send(SseEmitter.event().comment("connected"));
        } catch (IOException e) {
            sseEmitterRepository.remove(userId, emitter);
        }
        return emitter;
    }

    public void sendRetryCaptcha(Long userId, String recordId) {
        sendCaptchaResult(userId, CaptchaBlockMessage.retryCaptcha(recordId));
    }

    public void sendSuccessClose(Long userId, String recordId) {
        sendCaptchaResult(userId, CaptchaBlockMessage.successClose(recordId));
    }

    public void sendDenyClose(Long userId, String recordId) {
        sendCaptchaResult(userId, CaptchaBlockMessage.denyClose(recordId));
    }

    private void sendCaptchaResult(Long userId, CaptchaBlockMessage message) {
        List<SseEmitter> emitters = sseEmitterRepository.findByUserId(userId);
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("captcha")
                        .data(message, MediaType.APPLICATION_JSON));
                log.info("[BotDetectionSSE] CAPTCHA result 전송: userId={}, result={}", userId, message.result());
            } catch (IOException e) {
                log.warn("[BotDetectionSSE] CAPTCHA result 전송 실패: userId={}, message={}", userId, e.getMessage());
                sseEmitterRepository.remove(userId, emitter);
            }
        }
    }

    public CaptchaVerificationResponse verify(Long userId, CaptchaVerificationRequest request, String remoteIp) {
        validateCaptchaRetryRequest(request);
        validatePendingRecord(userId, request.recordId());

        if (!request.success()) {
            sendBlockResult(userId, request);
            throw new BaseException(BlacklistErrorCode.CAPTCHA_VERIFICATION_FAILED);
        }

        boolean verified = cloudflareTurnstileClient.verify(request.token(), remoteIp);
        if (!verified) {
            sendBlockResult(userId, request);
            throw new BaseException(BlacklistErrorCode.CAPTCHA_VERIFICATION_FAILED);
        }

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

    private void validateCaptchaRetryRequest(CaptchaVerificationRequest request) {
        if (request.type() != InferenceType.CAPTCHA_RETRY) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "type은 CAPTCHA_RETRY만 사용할 수 있습니다.");
        }
    }

    private void validatePendingRecord(Long userId, String recordId) {
        if (!botDetectionCaptchaRecordStore.exists(userId, recordId)) {
            throw new BaseException(BlacklistErrorCode.CAPTCHA_RECORD_NOT_FOUND);
        }
    }

    private void sendBlockResult(Long userId, CaptchaVerificationRequest request) {
        aiCaptchaVerificationResultClient.send(
                AiCaptchaVerificationResultRequest.block(request.recordId())
        );
        botDetectionCaptchaRecordStore.delete(userId, request.recordId());
        sendDenyClose(userId, request.recordId());
    }
}
