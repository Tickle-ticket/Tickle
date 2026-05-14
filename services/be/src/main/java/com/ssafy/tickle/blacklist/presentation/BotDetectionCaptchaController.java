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

    /**
     * 봇 탐지 CAPTCHA 상태를 수신할 SSE 연결을 등록합니다.
     *
     * @param userId   JWT에서 추출한 사용자 식별자
     * @param response SSE 프록시 버퍼링 방지 헤더를 설정할 HTTP 응답
     * @return CAPTCHA 상태 SSE emitter
     */
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

    /**
     * FE가 전달한 Cloudflare CAPTCHA 결과를 검증합니다.
     *
     * @param userId             JWT에서 추출한 사용자 식별자
     * @param request            CAPTCHA 검증 요청
     * @param httpServletRequest 클라이언트 IP 확인용 HTTP 요청
     * @return CAPTCHA 검증 처리 결과
     */
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
