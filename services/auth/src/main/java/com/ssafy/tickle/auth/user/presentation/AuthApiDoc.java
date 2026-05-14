package com.ssafy.tickle.auth.user.presentation;

import com.ssafy.tickle.auth.common.response.BaseResponse;
import com.ssafy.tickle.auth.user.presentation.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

/**
 * 인증 API 문서 인터페이스입니다.
 */
@Tag(name = "Auth", description = "인증 및 카카오 OAuth API (회원가입, 로그인, 로그아웃, 토큰 재발급)")
public interface AuthApiDoc {

    /**
     * 휴대폰 인증 코드 발송 API 문서 정의입니다.
     */
    @Operation(
            summary = "휴대폰 인증 코드 발송",
            description = "CoolSMS를 통해 6자리 인증 코드를 발송한다. 코드 유효 시간은 5분."
    )
    @ApiResponse(responseCode = "200", description = "발송 성공")
    @ApiResponse(responseCode = "409", description = "이미 가입된 전화번호")
    @ApiResponse(responseCode = "500", description = "SMS 발송 실패")
    ResponseEntity<BaseResponse<Void>> sendPhoneCode(
            @Valid @RequestBody PhoneCodeSendRequest request
    );

    /**
     * 휴대폰 인증 코드 검증 API 문서 정의입니다.
     */
    @Operation(
            summary = "휴대폰 인증 코드 검증",
            description = "입력한 코드가 올바르면 인증 완료 상태를 Redis에 10분간 저장한다."
    )
    @ApiResponse(responseCode = "200", description = "인증 성공")
    @ApiResponse(responseCode = "400", description = "코드 불일치 또는 만료")
    ResponseEntity<BaseResponse<Void>> verifyPhoneCode(
            @Valid @RequestBody PhoneCodeVerifyRequest request
    );

    /**
     * 자체 회원가입 API 문서 정의입니다.
     */
    @Operation(
            summary = "자체 회원가입",
            description = "일반 회원(USER) 또는 기획사(ORGANIZER) 회원가입. 휴대폰 인증 완료 필수. 가입 완료 시 Access Token은 응답 Body, Refresh Token은 HttpOnly Cookie로 발급."
    )
    @ApiResponse(responseCode = "201", description = "회원가입 성공")
    @ApiResponse(responseCode = "400", description = "유효성 검증 실패 또는 휴대폰 미인증")
    @ApiResponse(responseCode = "409", description = "이메일 또는 전화번호 중복")
    ResponseEntity<BaseResponse<AccessTokenResponse>> signUp(
            @Valid @RequestBody SignUpRequest request
    );

    /**
     * 자체 로그인 API 문서 정의입니다.
     */
    @Operation(
            summary = "자체 로그인",
            description = "이메일·비밀번호 로그인. 성공 시 Access Token은 응답 Body, Refresh Token은 HttpOnly Cookie로 발급."
    )
    @ApiResponse(responseCode = "200", description = "로그인 성공")
    @ApiResponse(responseCode = "401", description = "이메일 또는 비밀번호 불일치")
    ResponseEntity<BaseResponse<AccessTokenResponse>> login(
            @Valid @RequestBody LoginRequest request
    );

    /**
     * 목로그인 API 문서 정의입니다.
     */
    @Operation(
            summary = "목로그인",
            description = "이름과 전화번호만으로 자체 회원을 생성하거나 기존 전화번호 계정으로 로그인한다. 성공 시 실제 자체 로그인과 동일하게 Access Token은 응답 Body, Refresh Token은 HttpOnly Cookie로 발급."
    )
    @ApiResponse(responseCode = "200", description = "목로그인 성공")
    @ApiResponse(responseCode = "400", description = "유효성 검증 실패")
    ResponseEntity<BaseResponse<AccessTokenResponse>> mockLogin(
            @Valid @RequestBody MockLoginRequest request
    );

    /**
     * Kakao OAuth 로그인(토큰 발급) API 문서 정의입니다.
     */
    @Operation(
            summary = "카카오 OAuth 로그인 (토큰 교환 및 가입 유도)",
            description = "프론트엔드가 카카오로부터 받은 Authorization Code로 백엔드에 토큰을 요청합니다. 기존 회원이면 Access Token은 응답 Body, Refresh Token은 HttpOnly Cookie로 발급하고, 신규 회원이면 isNewUser=true와 signUpToken을 반환하여 추가 정보 입력(전화번호 등)을 유도합니다."
    )
    @ApiResponse(responseCode = "200", description = "카카오 로그인 성공 (기존 회원: 토큰 발급, 신규 회원: signUpToken 반환)")
    @ApiResponse(responseCode = "400", description = "잘못된 로그인 요청 (코드 또는 리다이렉트 URI 누락)")
    @ApiResponse(responseCode = "401", description = "카카오 로그인 실패")
    @ApiResponse(responseCode = "409", description = "동일 이메일 계정 존재")
    ResponseEntity<BaseResponse<KakaoLoginResponse>> kakaoLogin(
            @Valid @RequestBody KakaoLoginRequest request
    );

    /**
     * Kakao 신규 유저 가입 마무리 API 문서 정의입니다.
     */
    @Operation(
            summary = "카카오 신규 가입 마무리 (전화번호 등 입력)",
            description = "카카오 로그인 시 발급받은 signUpToken과 함께 전화번호, 이름, 생년월일을 전송하여 회원가입을 완료합니다. 가입 완료 시 Access Token은 응답 Body, Refresh Token은 HttpOnly Cookie로 발급."
    )
    @ApiResponse(responseCode = "201", description = "카카오 회원가입 완료 및 토큰 발급 성공")
    @ApiResponse(responseCode = "400", description = "입력값 검증 실패 또는 전화번호 미인증")
    @ApiResponse(responseCode = "401", description = "signUpToken 만료 또는 유효하지 않음")
    ResponseEntity<BaseResponse<AccessTokenResponse>> kakaoSignUp(
            @Valid @RequestBody KakaoSignUpRequest request
    );

    /**
     * 로그아웃 API 문서 정의입니다.
     */
    @Operation(
            summary = "로그아웃",
            description = "Refresh Token 삭제 및 쿠키 만료 + Access Token 블랙리스트 등록. 만료된 토큰이어도 Refresh Token은 삭제된다."
    )
    @ApiResponse(responseCode = "200", description = "로그아웃 성공")
    @ApiResponse(responseCode = "401", description = "유효하지 않은 토큰")
    ResponseEntity<BaseResponse<Void>> logout(
            @Parameter(description = "Bearer {accessToken}", required = true)
            @RequestHeader("Authorization") String authorization
    );

    /**
     * Access Token 재발급 API 문서 정의입니다.
     */
    @Operation(
            summary = "Access Token 재발급",
            description = "HttpOnly Cookie의 Refresh Token으로 Access Token을 재발급한다. Refresh Token Rotation 적용."
    )
    @ApiResponse(responseCode = "200", description = "재발급 성공")
    @ApiResponse(responseCode = "401", description = "Refresh Token 만료 또는 불일치")
    ResponseEntity<BaseResponse<AccessTokenResponse>> reissue(
            @Parameter(description = "HttpOnly Cookie refreshToken", required = true)
            @CookieValue(value = "refreshToken", required = false) String refreshToken
    );
}
