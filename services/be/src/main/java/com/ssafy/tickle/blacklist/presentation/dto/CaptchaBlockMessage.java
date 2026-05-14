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

    /**
     * FE에 CAPTCHA 재시도를 요청하는 SSE 메시지를 생성합니다.
     *
     * @param recordId AI 서버의 1차 봇 판별 결과 식별자
     * @return CAPTCHA 재시도 요청 메시지
     */
    public static CaptchaBlockMessage retryCaptcha(String recordId) {
        return new CaptchaBlockMessage(CaptchaResult.RETRY_CAPTCHA, recordId);
    }

    /**
     * CAPTCHA 성공 후 FE 모달 종료를 알리는 SSE 메시지를 생성합니다.
     *
     * @param recordId AI 서버의 1차 봇 판별 결과 식별자
     * @return CAPTCHA 성공 종료 메시지
     */
    public static CaptchaBlockMessage successClose(String recordId) {
        return new CaptchaBlockMessage(CaptchaResult.SUCCESS_CLOSE, recordId);
    }

    /**
     * CAPTCHA 실패 후 FE 모달 종료를 알리는 SSE 메시지를 생성합니다.
     *
     * @param recordId AI 서버의 1차 봇 판별 결과 식별자
     * @return CAPTCHA 실패 종료 메시지
     */
    public static CaptchaBlockMessage denyClose(String recordId) {
        return new CaptchaBlockMessage(CaptchaResult.DENY_CLOSE, recordId);
    }

    /**
     * FE CAPTCHA UI를 제어하기 위한 SSE 상태입니다.
     */
    public enum CaptchaResult {
        RETRY_CAPTCHA,
        SUCCESS_CLOSE,
        DENY_CLOSE
    }
}
