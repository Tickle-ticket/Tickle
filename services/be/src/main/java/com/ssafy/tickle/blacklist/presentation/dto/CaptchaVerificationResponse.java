package com.ssafy.tickle.blacklist.presentation.dto;

import com.ssafy.tickle.blacklist.presentation.dto.CaptchaBlockMessage.CaptchaResult;

/**
 * CAPTCHA 검증 처리 결과 응답입니다.
 *
 * @param verified Cloudflare 검증 성공 여부
 * @param result   처리 결과
 */
public record CaptchaVerificationResponse(
        boolean verified,
        CaptchaResult result
) {

    /**
     * CAPTCHA 검증 성공 후 FE가 모달을 닫을 수 있는 응답을 생성합니다.
     *
     * @return CAPTCHA 성공 종료 응답
     */
    public static CaptchaVerificationResponse successClose() {
        return new CaptchaVerificationResponse(true, CaptchaResult.SUCCESS_CLOSE);
    }
}
