package com.ssafy.tickle.auth.user.presentation;

import com.ssafy.tickle.auth.common.response.BaseResponse;
import com.ssafy.tickle.auth.user.presentation.dto.LoginRequest;
import com.ssafy.tickle.auth.user.presentation.dto.PhoneCodeSendRequest;
import com.ssafy.tickle.auth.user.presentation.dto.PhoneCodeVerifyRequest;
import com.ssafy.tickle.auth.user.presentation.dto.ReissueRequest;
import com.ssafy.tickle.auth.user.presentation.dto.SignUpRequest;
import com.ssafy.tickle.auth.user.presentation.dto.TokenResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * 인증 API 문서 인터페이스입니다.
 */
@Tag(name = "Auth", description = "자체 인증 API (회원가입, 로그인, 로그아웃, 토큰 재발급)")
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
            description = "일반 회원(USER) 또는 기획사(ORGANIZER) 회원가입. 휴대폰 인증 완료 필수. 가입 완료 시 Token 즉시 발급."
    )
    @ApiResponse(responseCode = "201", description = "회원가입 성공")
    @ApiResponse(responseCode = "400", description = "유효성 검증 실패 또는 휴대폰 미인증")
    @ApiResponse(responseCode = "409", description = "이메일 또는 전화번호 중복")
    ResponseEntity<BaseResponse<TokenResponse>> signUp(
            @Valid @RequestBody SignUpRequest request
    );

    /**
     * 자체 로그인 API 문서 정의입니다.
     */
    @Operation(
            summary = "자체 로그인",
            description = "이메일·비밀번호 로그인. 성공 시 Access Token / Refresh Token 발급."
    )
    @ApiResponse(responseCode = "200", description = "로그인 성공")
    @ApiResponse(responseCode = "401", description = "이메일 또는 비밀번호 불일치")
    ResponseEntity<BaseResponse<TokenResponse>> login(
            @Valid @RequestBody LoginRequest request
    );

    /**
     * Kakao OAuth 로그인 API 문서 정의입니다.
     */
    @Operation(
            summary = "카카오 OAuth 로그인",
            description = "Kakao authorization code 요청 URL로 리다이렉트한다."
    )
    @ApiResponse(responseCode = "302", description = "Kakao 로그인 페이지로 리다이렉트")
    ResponseEntity<Void> redirectToKakao();

    /**
     * Kakao OAuth 콜백 API 문서 정의입니다.
     */
    @Operation(
            summary = "카카오 OAuth 콜백",
            description = "Kakao authorization code로 Kakao 사용자 정보를 조회하고 Tickle Access Token / Refresh Token을 발급한다."
    )
    @ApiResponse(responseCode = "200", description = "카카오 로그인 성공")
    @ApiResponse(responseCode = "400", description = "잘못된 콜백 요청 또는 이메일 동의 누락")
    @ApiResponse(responseCode = "401", description = "카카오 로그인 실패")
    @ApiResponse(responseCode = "409", description = "동일 이메일 계정 존재")
    ResponseEntity<BaseResponse<TokenResponse>> kakaoCallback(
            @Parameter(description = "Kakao authorization code")
            @RequestParam(required = false) String code,

            @Parameter(description = "Kakao authorization error")
            @RequestParam(required = false) String error
    );

    /**
     * 로그아웃 API 문서 정의입니다.
     */
    @Operation(
            summary = "로그아웃",
            description = "Refresh Token 삭제 + Access Token 블랙리스트 등록. 만료된 토큰이어도 Refresh Token은 삭제된다."
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
            description = "Refresh Token으로 Access Token 재발급. Refresh Token Rotation 적용 (둘 다 새로 발급)."
    )
    @ApiResponse(responseCode = "200", description = "재발급 성공")
    @ApiResponse(responseCode = "401", description = "Refresh Token 만료 또는 불일치")
    ResponseEntity<BaseResponse<TokenResponse>> reissue(
            @Valid @RequestBody ReissueRequest request
    );
}
