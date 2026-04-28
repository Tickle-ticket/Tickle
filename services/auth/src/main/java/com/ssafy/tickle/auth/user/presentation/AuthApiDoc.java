package com.ssafy.tickle.auth.user.presentation;

import com.ssafy.tickle.auth.common.response.BaseResponse;
import com.ssafy.tickle.auth.user.presentation.dto.LoginRequest;
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

/**
 * 인증 API 문서 인터페이스입니다.
 */
@Tag(name = "Auth", description = "자체 인증 API (회원가입, 로그인, 로그아웃, 토큰 재발급)")
public interface AuthApiDoc {

    /**
     * 자체 회원가입 API 문서 정의입니다.
     */
    @Operation(
            summary = "자체 회원가입",
            description = "이메일·비밀번호 기반 회원가입. 가입 완료 시 Access Token / Refresh Token 즉시 발급."
    )
    @ApiResponse(responseCode = "201", description = "회원가입 성공")
    @ApiResponse(responseCode = "400", description = "유효성 검증 실패")
    @ApiResponse(responseCode = "409", description = "이메일 중복")
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
