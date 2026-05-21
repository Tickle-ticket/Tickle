package com.ssafy.tickle.blacklist.domain;

import com.ssafy.tickle.common.exception.code.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 블랙리스트 도메인 에러 코드입니다.
 */
@Getter
@RequiredArgsConstructor
public enum BlacklistErrorCode implements ErrorCode {

    ALREADY_BLACKLISTED(409, "이미 블랙리스트에 등록된 사용자입니다."),
    BLACKLISTED_USER(403, "블랙리스트에 등록된 사용자입니다. 티켓팅 서비스 이용이 제한됩니다."),
    BLACKLIST_NOT_FOUND(404, "블랙리스트 항목을 찾을 수 없습니다."),
    CAPTCHA_VERIFICATION_FAILED(400, "CAPTCHA 검증에 실패했습니다."),
    CAPTCHA_RECORD_NOT_FOUND(400, "유효하지 않은 CAPTCHA 검증 요청입니다.");

    private final int status;
    private final String message;
}
