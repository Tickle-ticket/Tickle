package com.ssafy.tickle.blacklist.application;

import com.ssafy.tickle.blacklist.domain.BlacklistErrorCode;
import com.ssafy.tickle.blacklist.infrastructure.client.CloudflareTurnstileClient;
import com.ssafy.tickle.blacklist.infrastructure.sse.BotDetectionSseEmitterRepository;
import com.ssafy.tickle.blacklist.presentation.dto.CaptchaBlockMessage;
import com.ssafy.tickle.blacklist.presentation.dto.CaptchaVerificationRequest;
import com.ssafy.tickle.blacklist.presentation.dto.CaptchaVerificationResponse;
import com.ssafy.tickle.common.exception.BaseException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;

/**
 * 봇 탐지 CAPTCHA SSE 연결과 검증 결과 처리를 담당합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BotDetectionCaptchaService {

    private final BotDetectionSseEmitterRepository sseEmitterRepository;
    private final CloudflareTurnstileClient cloudflareTurnstileClient;
    private final BlacklistService blacklistService;

    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = sseEmitterRepository.add(userId);
        try {
            emitter.send(SseEmitter.event().comment("connected"));
        } catch (IOException e) {
            sseEmitterRepository.remove(userId, emitter);
        }
        return emitter;
    }

    public void sendRetryCaptcha(Long userId) {
        sendCaptchaResult(userId, CaptchaBlockMessage.retryCaptcha());
    }

    public void sendSuccessClose(Long userId) {
        sendCaptchaResult(userId, CaptchaBlockMessage.successClose());
    }

    public void sendDenyClose(Long userId) {
        sendCaptchaResult(userId, CaptchaBlockMessage.denyClose());
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

    @Transactional
    public CaptchaVerificationResponse verify(Long userId, CaptchaVerificationRequest request, String remoteIp) {
        if (!request.success()) {
            sendDenyClose(userId);
            throw new BaseException(BlacklistErrorCode.CAPTCHA_VERIFICATION_FAILED);
        }

        boolean verified = cloudflareTurnstileClient.verify(request.token(), remoteIp);
        if (!verified) {
            sendDenyClose(userId);
            throw new BaseException(BlacklistErrorCode.CAPTCHA_VERIFICATION_FAILED);
        }

        blacklistService.removeBlacklistByUserId(userId);
        sendSuccessClose(userId);
        log.info(
                "CAPTCHA 검증 성공 및 블랙리스트 해제: userId={}, type={}, eventId={}, scheduleId={}, eventDate={}, createdAt={}",
                userId,
                request.type(),
                request.eventId(),
                request.scheduleId(),
                request.eventDate(),
                request.createdAt()
        );
        return CaptchaVerificationResponse.successClose();
    }
}
