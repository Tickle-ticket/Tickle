package com.ssafy.tickle.blacklist.presentation;

import com.ssafy.tickle.blacklist.application.BotDetectionCaptchaService;
import com.ssafy.tickle.blacklist.presentation.dto.CaptchaVerificationRequest;
import com.ssafy.tickle.blacklist.presentation.dto.CaptchaVerificationResponse;
import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.response.BaseResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 봇 탐지 CAPTCHA SSE 및 검증 API 컨트롤러입니다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/bot-detection")
public class BotDetectionCaptchaController implements BotDetectionCaptchaApiDoc {

    private final BotDetectionCaptchaService botDetectionCaptchaService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Override
    public SseEmitter subscribe(
            @UserId Long userId,
            HttpServletResponse response
    ) {
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache");
        return botDetectionCaptchaService.subscribe(userId);
    }

    @PostMapping("/captcha/verify")
    @Override
    public ResponseEntity<BaseResponse<CaptchaVerificationResponse>> verifyCaptcha(
            @UserId Long userId,
            @Valid @RequestBody CaptchaVerificationRequest request,
            HttpServletRequest httpServletRequest
    ) {
        CaptchaVerificationResponse response = botDetectionCaptchaService.verify(
                userId,
                request,
                httpServletRequest.getRemoteAddr()
        );
        return ResponseEntity.ok().body(BaseResponse.success(200, "CAPTCHA 검증을 처리했습니다.", response));
    }
}
