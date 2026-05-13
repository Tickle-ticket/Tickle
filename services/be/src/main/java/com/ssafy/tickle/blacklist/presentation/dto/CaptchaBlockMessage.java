package com.ssafy.tickle.blacklist.presentation.dto;

/**
 * 봇 탐지 CAPTCHA 요청 SSE 메시지입니다.
 *
 * @param result CAPTCHA 처리 결과
 */
public record CaptchaBlockMessage(
        CaptchaResult result
) {

    public static CaptchaBlockMessage retryCaptcha() {
        return new CaptchaBlockMessage(CaptchaResult.RETRY_CAPTCHA);
    }

    public static CaptchaBlockMessage successClose() {
        return new CaptchaBlockMessage(CaptchaResult.SUCCESS_CLOSE);
    }

    public static CaptchaBlockMessage denyClose() {
        return new CaptchaBlockMessage(CaptchaResult.DENY_CLOSE);
    }

    public enum CaptchaResult {
        RETRY_CAPTCHA,
        SUCCESS_CLOSE,
        DENY_CLOSE
    }
}
