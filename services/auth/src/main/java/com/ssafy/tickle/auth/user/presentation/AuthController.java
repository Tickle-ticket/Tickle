package com.ssafy.tickle.auth.user.presentation;

import com.ssafy.tickle.auth.common.exception.BaseException;
import com.ssafy.tickle.auth.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.auth.common.exception.code.SuccessCode;
import com.ssafy.tickle.auth.common.response.BaseResponse;
import com.ssafy.tickle.auth.user.application.AuthService;
import com.ssafy.tickle.auth.user.application.dto.KakaoLoginResult;
import com.ssafy.tickle.auth.user.application.PhoneVerificationService;
import com.ssafy.tickle.auth.user.application.dto.TokenResult;
import com.ssafy.tickle.auth.user.domain.AuthErrorCode;
import com.ssafy.tickle.auth.user.presentation.dto.AccessTokenResponse;
import com.ssafy.tickle.auth.user.presentation.dto.AdminSignUpRequest;
import com.ssafy.tickle.auth.user.presentation.dto.LoginRequest;
import com.ssafy.tickle.auth.user.presentation.dto.MockLoginRequest;
import com.ssafy.tickle.auth.user.presentation.dto.PhoneCodeSendRequest;
import com.ssafy.tickle.auth.user.presentation.dto.PhoneCodeVerifyRequest;
import com.ssafy.tickle.auth.user.presentation.dto.ReissueRequest;
import com.ssafy.tickle.auth.user.presentation.dto.SignUpRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/**
 * 인증 API를 제공하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController implements AuthApiDoc {

    private static final String REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
    private static final String REFRESH_TOKEN_COOKIE_PATH = "/api/v1/auth";

    private final AuthService authService;
    private final PhoneVerificationService phoneVerificationService;

    @Value("${jwt.refresh-token-expiry-seconds}")
    private long refreshTokenExpirySeconds;

    /**
     * 어드민 계정 생성 API입니다.
     *
     * @param secret  X-Admin-Secret 헤더
     * @param request 어드민 계정 생성 요청
     * @return 발급된 토큰 응답 (201 Created)
     */
    @PostMapping("/admin/signup")
    public ResponseEntity<BaseResponse<AccessTokenResponse>> createAdminAccount(
            @RequestHeader("X-Admin-Secret") String secret,
            @Valid @RequestBody AdminSignUpRequest request
    ) {
        TokenResult tokenResult = authService.createAdminAccount(request, secret);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, createRefreshTokenCookie(tokenResult.refreshToken()).toString())
                .body(BaseResponse.success(SuccessCode.CREATED, toAccessTokenResponse(tokenResult)));
    }

    /**
     * 자체 회원가입 API입니다.
     *
     * @param request 회원가입 요청
     * @return 발급된 토큰 응답 (201 Created)
     */
    @Override
    @PostMapping("/signup")
    public ResponseEntity<BaseResponse<AccessTokenResponse>> signUp(
            @Valid @RequestBody SignUpRequest request
    ) {
        TokenResult tokenResult = authService.signUp(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, createRefreshTokenCookie(tokenResult.refreshToken()).toString())
                .body(BaseResponse.success(SuccessCode.CREATED, toAccessTokenResponse(tokenResult)));
    }

    /**
     * 자체 로그인 API입니다.
     *
     * @param request 로그인 요청 (email, password)
     * @return 발급된 토큰 응답
     */
    @Override
    @PostMapping("/login")
    public ResponseEntity<BaseResponse<AccessTokenResponse>> login(
            @Valid @RequestBody LoginRequest request
    ) {
        TokenResult tokenResult = authService.login(request);
        return ResponseEntity
                .ok()
                .header(HttpHeaders.SET_COOKIE, createRefreshTokenCookie(tokenResult.refreshToken()).toString())
                .body(BaseResponse.success(toAccessTokenResponse(tokenResult)));
    }

    /**
     * 목로그인 API입니다.
     *
     * @param request 목로그인 요청 (name, phoneNumber)
     * @return 발급된 토큰 응답
     */
    @Override
    @PostMapping("/mock-login")
    public ResponseEntity<BaseResponse<AccessTokenResponse>> mockLogin(
            @Valid @RequestBody MockLoginRequest request
    ) {
        TokenResult tokenResult = authService.mockLogin(request);
        return ResponseEntity
                .ok()
                .header(HttpHeaders.SET_COOKIE, createRefreshTokenCookie(tokenResult.refreshToken()).toString())
                .body(BaseResponse.success(toAccessTokenResponse(tokenResult)));
    }



    /**
     * Kakao OAuth 로그인(토큰 발급 또는 회원가입 유도) API입니다.
     *
     * @param request 프론트엔드가 전달한 인가 코드와 리다이렉트 URI
     * @return 카카오 로그인 응답 (신규 유저 여부 포함)
     */
    @Override
    @PostMapping("/kakao/login")
    public ResponseEntity<BaseResponse<com.ssafy.tickle.auth.user.presentation.dto.KakaoLoginResponse>> kakaoLogin(
            @Valid @RequestBody com.ssafy.tickle.auth.user.presentation.dto.KakaoLoginRequest request
    ) {
        KakaoLoginResult result = authService.kakaoLogin(request);
        if (result.refreshToken() != null) {
            return ResponseEntity
                    .ok()
                    .header(HttpHeaders.SET_COOKIE, createRefreshTokenCookie(result.refreshToken()).toString())
                    .body(BaseResponse.success(result.response()));
        }
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(result.response()));
    }

    /**
     * Kakao 신규 유저 회원가입 마무리 API입니다.
     *
     * @param request 프론트엔드가 전달한 가입 토큰, 전화번호, 이름, 생년월일
     * @return 발급된 토큰 응답
     */
    @PostMapping("/kakao/signup")
    public ResponseEntity<BaseResponse<AccessTokenResponse>> kakaoSignUp(
            @Valid @RequestBody com.ssafy.tickle.auth.user.presentation.dto.KakaoSignUpRequest request
    ) {
        TokenResult tokenResult = authService.kakaoSignUp(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, createRefreshTokenCookie(tokenResult.refreshToken()).toString())
                .body(BaseResponse.success(SuccessCode.CREATED, toAccessTokenResponse(tokenResult)));
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
                .header(HttpHeaders.SET_COOKIE, deleteRefreshTokenCookie().toString())
                .body(BaseResponse.success(SuccessCode.OK));
    }

    /**
     * Access Token 재발급 API입니다.
     *
     * @param refreshToken HttpOnly Cookie로 전달된 Refresh Token
     * @return 새로 발급된 토큰 응답
     */
    @Override
    @PostMapping("/reissue")
    public ResponseEntity<BaseResponse<AccessTokenResponse>> reissue(
            @CookieValue(value = REFRESH_TOKEN_COOKIE_NAME, required = false) String refreshToken
    ) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BaseException(AuthErrorCode.REFRESH_TOKEN_NOT_FOUND);
        }
        TokenResult tokenResult = authService.reissue(new ReissueRequest(refreshToken));
        return ResponseEntity
                .ok()
                .header(HttpHeaders.SET_COOKIE, createRefreshTokenCookie(tokenResult.refreshToken()).toString())
                .body(BaseResponse.success(toAccessTokenResponse(tokenResult)));
    }

    private AccessTokenResponse toAccessTokenResponse(TokenResult tokenResult) {
        return new AccessTokenResponse(tokenResult.accessToken());
    }

    private ResponseCookie createRefreshTokenCookie(String refreshToken) {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path(REFRESH_TOKEN_COOKIE_PATH)
                .maxAge(Duration.ofSeconds(refreshTokenExpirySeconds))
                .build();
    }

    private ResponseCookie deleteRefreshTokenCookie() {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path(REFRESH_TOKEN_COOKIE_PATH)
                .maxAge(Duration.ZERO)
                .build();
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
