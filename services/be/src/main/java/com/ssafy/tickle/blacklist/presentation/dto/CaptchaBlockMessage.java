package com.ssafy.tickle.blacklist.presentation.dto;

/**
 * 봇 탐지 CAPTCHA 요청 SSE 메시지입니다.
 *
 * @param result   CAPTCHA 처리 결과
 * @param recordId AI 서버의 1차 봇 판별 결과 식별자
 */
public record CaptchaBlockMessage(
        CaptchaResult result,
        String recordId
) {

    public static CaptchaBlockMessage retryCaptcha(String recordId) {
        return new CaptchaBlockMessage(CaptchaResult.RETRY_CAPTCHA, recordId);
    }

    public static CaptchaBlockMessage successClose(String recordId) {
        return new CaptchaBlockMessage(CaptchaResult.SUCCESS_CLOSE, recordId);
    }

    public static CaptchaBlockMessage denyClose(String recordId) {
        return new CaptchaBlockMessage(CaptchaResult.DENY_CLOSE, recordId);
    }

    public enum CaptchaResult {
        RETRY_CAPTCHA,
        SUCCESS_CLOSE,
        DENY_CLOSE
    }
}
