package com.ssafy.tickle.auth.user.presentation;

import com.ssafy.tickle.auth.common.exception.BaseException;
import com.ssafy.tickle.auth.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.auth.common.exception.code.SuccessCode;
import com.ssafy.tickle.auth.common.response.BaseResponse;
import com.ssafy.tickle.auth.user.application.AuthService;
import com.ssafy.tickle.auth.user.application.PhoneVerificationService;
import com.ssafy.tickle.auth.user.presentation.dto.LoginRequest;
import com.ssafy.tickle.auth.user.presentation.dto.PhoneCodeSendRequest;
import com.ssafy.tickle.auth.user.presentation.dto.PhoneCodeVerifyRequest;
import com.ssafy.tickle.auth.user.presentation.dto.ReissueRequest;
import com.ssafy.tickle.auth.user.presentation.dto.SignUpRequest;
import com.ssafy.tickle.auth.user.presentation.dto.TokenResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 인증 API를 제공하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController implements AuthApiDoc {

    private final AuthService authService;
    private final PhoneVerificationService phoneVerificationService;

    /**
     * 자체 회원가입 API입니다.
     *
     * @param request 회원가입 요청
     * @return 발급된 토큰 응답 (201 Created)
     */
    @Override
    @PostMapping("/signup")
    public ResponseEntity<BaseResponse<TokenResponse>> signUp(
            @Valid @RequestBody SignUpRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(BaseResponse.success(SuccessCode.CREATED, authService.signUp(request)));
    }

    /**
     * 자체 로그인 API입니다.
     *
     * @param request 로그인 요청 (email, password)
     * @return 발급된 토큰 응답
     */
    @Override
    @PostMapping("/login")
    public ResponseEntity<BaseResponse<TokenResponse>> login(
            @Valid @RequestBody LoginRequest request
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(authService.login(request)));
    }

    /**
     * 로그아웃 API입니다.
     *
     * @param authorization Authorization 헤더 (Bearer {accessToken})
     * @return 빈 응답
     */
    @Override
    @PostMapping("/logout")
    public ResponseEntity<BaseResponse<Void>> logout(
            @RequestHeader("Authorization") String authorization
    ) {
        if (!authorization.startsWith("Bearer ")) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST);
        }
        authService.logout(authorization.substring(7));
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK));
    }

    /**
     * Access Token 재발급 API입니다.
     *
     * @param request 재발급 요청 (refreshToken)
     * @return 새로 발급된 토큰 응답
     */
    @Override
    @PostMapping("/reissue")
    public ResponseEntity<BaseResponse<TokenResponse>> reissue(
            @Valid @RequestBody ReissueRequest request
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(authService.reissue(request)));
    }

    /**
     * 휴대폰 인증 코드 발송 API입니다.
     *
     * @param request 발송 요청 (phoneNumber)
     * @return 빈 응답
     */
    @Override
    @PostMapping("/phone/send")
    public ResponseEntity<BaseResponse<Void>> sendPhoneCode(
            @Valid @RequestBody PhoneCodeSendRequest request
    ) {
        phoneVerificationService.sendCode(request.phoneNumber());
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK));
    }

    /**
     * 휴대폰 인증 코드 검증 API입니다.
     *
     * @param request 검증 요청 (phoneNumber, code)
     * @return 빈 응답
     */
    @Override
    @PostMapping("/phone/verify")
    public ResponseEntity<BaseResponse<Void>> verifyPhoneCode(
            @Valid @RequestBody PhoneCodeVerifyRequest request
    ) {
        phoneVerificationService.verifyCode(request.phoneNumber(), request.code());
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK));
    }
}
