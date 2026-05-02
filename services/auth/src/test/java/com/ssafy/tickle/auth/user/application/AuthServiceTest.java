package com.ssafy.tickle.auth.user.application;

import com.ssafy.tickle.auth.common.exception.BaseException;
import com.ssafy.tickle.auth.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.auth.common.util.JwtProvider;
import com.ssafy.tickle.auth.common.util.RedisTokenStore;
import com.ssafy.tickle.auth.user.domain.AuthErrorCode;
import com.ssafy.tickle.auth.user.domain.AuthUser;
import com.ssafy.tickle.auth.user.infrastructure.client.BeInternalClient;
import com.ssafy.tickle.auth.user.infrastructure.client.dto.CreateUserRequest;
import com.ssafy.tickle.auth.user.infrastructure.oauth.KakaoOAuthClient;
import com.ssafy.tickle.auth.user.infrastructure.oauth.dto.KakaoTokenResponse;
import com.ssafy.tickle.auth.user.infrastructure.oauth.dto.KakaoUserInfoResponse;
import com.ssafy.tickle.auth.user.infrastructure.persistence.AuthUserRepository;
import com.ssafy.tickle.auth.user.presentation.dto.LoginRequest;
import com.ssafy.tickle.auth.user.presentation.dto.ReissueRequest;
import com.ssafy.tickle.auth.user.presentation.dto.SignUpRequest;
import com.ssafy.tickle.auth.user.presentation.dto.TokenResponse;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * AuthService 단위 테스트입니다.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AuthService 단위 테스트")
class AuthServiceTest {

    @Mock private AuthUserRepository authUserRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtProvider jwtProvider;
    @Mock private RedisTokenStore redisTokenStore;
    @Mock private BeInternalClient beInternalClient;
    @Mock private PhoneVerificationService phoneVerificationService;
    @Mock private KakaoOAuthClient kakaoOAuthClient;

    @InjectMocks private AuthService authService;

    private static final Long   USER_ID        = 1L;
    private static final String EMAIL          = "test@example.com";
    private static final String PASSWORD       = "Password1!";
    private static final String ENCODED_PW     = "$2a$10$encoded";
    private static final String ACCESS_TOKEN   = "access.token.jwt";
    private static final String REFRESH_TOKEN  = "refresh.token.jwt";
    private static final String NEW_ACCESS     = "new.access.jwt";
    private static final String NEW_REFRESH    = "new.refresh.jwt";
    private static final String NAME           = "홍길동";
    private static final String NICKNAME       = "길동이";
    private static final String PHONE          = "01012345678";
    private static final String ORGANIZER_NAME = "티켓엔터테인먼트";
    private static final String KAKAO_CODE     = "kakao-auth-code";
    private static final String KAKAO_ACCESS   = "kakao-access-token";
    private static final Long   KAKAO_ID       = 123456789L;
    private static final long   REFRESH_EXPIRY = 604800L;

    private AuthUser userAuthUser;
    private AuthUser organizerAuthUser;
    private AuthUser kakaoAuthUser;

    @BeforeEach
    void setUp() {
        userAuthUser = AuthUser.builder()
                .email(EMAIL)
                .password(ENCODED_PW)
                .role(AuthUser.Role.USER)
                .phoneNumber(PHONE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        ReflectionTestUtils.setField(userAuthUser, "id", USER_ID);

        organizerAuthUser = AuthUser.builder()
                .email(EMAIL)
                .password(ENCODED_PW)
                .role(AuthUser.Role.ORGANIZER)
                .phoneNumber(PHONE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        ReflectionTestUtils.setField(organizerAuthUser, "id", USER_ID);

        kakaoAuthUser = AuthUser.builder()
                .email(EMAIL)
                .role(AuthUser.Role.USER)
                .oauthProvider(AuthUser.OAuthProvider.KAKAO)
                .oauthProviderUserId(KAKAO_ID.toString())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        ReflectionTestUtils.setField(kakaoAuthUser, "id", USER_ID);
    }

    // ── signUp ───────────────────────────────────────────────────
    @Nested
    @DisplayName("회원가입 (signUp)")
    class SignUpTest {

        @Test
        @DisplayName("일반 회원(USER) 정상 회원가입 시 토큰을 반환한다")
        void signUp_user_success() {
            SignUpRequest request = new SignUpRequest(EMAIL, PASSWORD, NAME, NICKNAME, PHONE,
                    AuthUser.Role.USER, null, null);

            given(authUserRepository.existsByEmail(EMAIL)).willReturn(false);
            given(authUserRepository.existsByPhoneNumber(PHONE)).willReturn(false);
            given(phoneVerificationService.isVerified(PHONE)).willReturn(true);
            given(passwordEncoder.encode(PASSWORD)).willReturn(ENCODED_PW);
            given(authUserRepository.save(any(AuthUser.class))).willReturn(userAuthUser);
            willDoNothing().given(beInternalClient).createUser(any(CreateUserRequest.class));
            willDoNothing().given(phoneVerificationService).clearVerified(PHONE);
            given(jwtProvider.issueAccessToken(USER_ID, AuthUser.Role.USER)).willReturn(ACCESS_TOKEN);
            given(jwtProvider.issueRefreshToken(USER_ID)).willReturn(REFRESH_TOKEN);
            given(jwtProvider.getRefreshTokenExpirySeconds()).willReturn(REFRESH_EXPIRY);

            TokenResponse response = authService.signUp(request);

            assertThat(response.accessToken()).isEqualTo(ACCESS_TOKEN);
            assertThat(response.refreshToken()).isEqualTo(REFRESH_TOKEN);
            assertThat(response.userId()).isEqualTo(USER_ID);
            verify(phoneVerificationService).clearVerified(PHONE);
        }

        @Test
        @DisplayName("기획사(ORGANIZER) 정상 회원가입 시 토큰을 반환한다")
        void signUp_organizer_success() {
            SignUpRequest request = new SignUpRequest(EMAIL, PASSWORD, NAME, null, PHONE,
                    AuthUser.Role.ORGANIZER, null, ORGANIZER_NAME);

            given(authUserRepository.existsByEmail(EMAIL)).willReturn(false);
            given(authUserRepository.existsByPhoneNumber(PHONE)).willReturn(false);
            given(phoneVerificationService.isVerified(PHONE)).willReturn(true);
            given(passwordEncoder.encode(PASSWORD)).willReturn(ENCODED_PW);
            given(authUserRepository.save(any(AuthUser.class))).willReturn(organizerAuthUser);
            willDoNothing().given(beInternalClient).createUser(any(CreateUserRequest.class));
            willDoNothing().given(phoneVerificationService).clearVerified(PHONE);
            given(jwtProvider.issueAccessToken(USER_ID, AuthUser.Role.ORGANIZER)).willReturn(ACCESS_TOKEN);
            given(jwtProvider.issueRefreshToken(USER_ID)).willReturn(REFRESH_TOKEN);
            given(jwtProvider.getRefreshTokenExpirySeconds()).willReturn(REFRESH_EXPIRY);

            TokenResponse response = authService.signUp(request);

            assertThat(response.userId()).isEqualTo(USER_ID);
        }

        @Test
        @DisplayName("이메일 중복 시 DUPLICATE_EMAIL 예외를 던진다")
        void signUp_duplicateEmail_throwsException() {
            SignUpRequest request = new SignUpRequest(EMAIL, PASSWORD, NAME, NICKNAME, PHONE,
                    AuthUser.Role.USER, null, null);

            given(authUserRepository.existsByEmail(EMAIL)).willReturn(true);

            assertThatThrownBy(() -> authService.signUp(request))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.DUPLICATE_EMAIL));

            verify(authUserRepository, never()).save(any());
        }

        @Test
        @DisplayName("전화번호 중복 시 DUPLICATE_PHONE 예외를 던진다")
        void signUp_duplicatePhone_throwsException() {
            SignUpRequest request = new SignUpRequest(EMAIL, PASSWORD, NAME, NICKNAME, PHONE,
                    AuthUser.Role.USER, null, null);

            given(authUserRepository.existsByEmail(EMAIL)).willReturn(false);
            given(authUserRepository.existsByPhoneNumber(PHONE)).willReturn(true);

            assertThatThrownBy(() -> authService.signUp(request))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.DUPLICATE_PHONE));
        }

        @Test
        @DisplayName("휴대폰 미인증 시 PHONE_NOT_VERIFIED 예외를 던진다")
        void signUp_phoneNotVerified_throwsException() {
            SignUpRequest request = new SignUpRequest(EMAIL, PASSWORD, NAME, NICKNAME, PHONE,
                    AuthUser.Role.USER, null, null);

            given(authUserRepository.existsByEmail(EMAIL)).willReturn(false);
            given(authUserRepository.existsByPhoneNumber(PHONE)).willReturn(false);
            given(phoneVerificationService.isVerified(PHONE)).willReturn(false);

            assertThatThrownBy(() -> authService.signUp(request))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.PHONE_NOT_VERIFIED));
        }

        @Test
        @DisplayName("일반 회원이 닉네임 없이 가입 시 NICKNAME_REQUIRED 예외를 던진다")
        void signUp_userWithoutNickname_throwsException() {
            SignUpRequest request = new SignUpRequest(EMAIL, PASSWORD, NAME, null, PHONE,
                    AuthUser.Role.USER, null, null);

            given(authUserRepository.existsByEmail(EMAIL)).willReturn(false);
            given(authUserRepository.existsByPhoneNumber(PHONE)).willReturn(false);
            given(phoneVerificationService.isVerified(PHONE)).willReturn(true);

            assertThatThrownBy(() -> authService.signUp(request))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.NICKNAME_REQUIRED));
        }

        @Test
        @DisplayName("기획사가 기획사명 없이 가입 시 ORGANIZER_NAME_REQUIRED 예외를 던진다")
        void signUp_organizerWithoutName_throwsException() {
            SignUpRequest request = new SignUpRequest(EMAIL, PASSWORD, NAME, null, PHONE,
                    AuthUser.Role.ORGANIZER, null, null);

            given(authUserRepository.existsByEmail(EMAIL)).willReturn(false);
            given(authUserRepository.existsByPhoneNumber(PHONE)).willReturn(false);
            given(phoneVerificationService.isVerified(PHONE)).willReturn(true);

            assertThatThrownBy(() -> authService.signUp(request))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.ORGANIZER_NAME_REQUIRED));
        }

        @Test
        @DisplayName("BE 내부 API 호출 실패 시 INTERNAL_SERVER_ERROR 예외를 던진다")
        void signUp_beCallFails_throwsInternalServerError() {
            SignUpRequest request = new SignUpRequest(EMAIL, PASSWORD, NAME, NICKNAME, PHONE,
                    AuthUser.Role.USER, null, null);

            given(authUserRepository.existsByEmail(EMAIL)).willReturn(false);
            given(authUserRepository.existsByPhoneNumber(PHONE)).willReturn(false);
            given(phoneVerificationService.isVerified(PHONE)).willReturn(true);
            given(passwordEncoder.encode(PASSWORD)).willReturn(ENCODED_PW);
            given(authUserRepository.save(any(AuthUser.class))).willReturn(userAuthUser);
            willThrow(new RuntimeException("BE 연결 실패"))
                    .given(beInternalClient).createUser(any(CreateUserRequest.class));

            assertThatThrownBy(() -> authService.signUp(request))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(GlobalErrorCode.INTERNAL_SERVER_ERROR));

            verify(jwtProvider, never()).issueAccessToken(any(), any());
        }

        @Test
        @DisplayName("회원가입 시 CreateUserRequest에 role, phoneNumber, nickname이 올바르게 전달된다")
        void signUp_createsUserRequestWithCorrectData() {
            SignUpRequest request = new SignUpRequest(EMAIL, PASSWORD, NAME, NICKNAME, PHONE,
                    AuthUser.Role.USER, null, null);

            given(authUserRepository.existsByEmail(EMAIL)).willReturn(false);
            given(authUserRepository.existsByPhoneNumber(PHONE)).willReturn(false);
            given(phoneVerificationService.isVerified(PHONE)).willReturn(true);
            given(passwordEncoder.encode(PASSWORD)).willReturn(ENCODED_PW);
            given(authUserRepository.save(any(AuthUser.class))).willReturn(userAuthUser);
            willDoNothing().given(beInternalClient).createUser(any(CreateUserRequest.class));
            willDoNothing().given(phoneVerificationService).clearVerified(PHONE);
            given(jwtProvider.issueAccessToken(any(), any())).willReturn(ACCESS_TOKEN);
            given(jwtProvider.issueRefreshToken(any())).willReturn(REFRESH_TOKEN);
            given(jwtProvider.getRefreshTokenExpirySeconds()).willReturn(REFRESH_EXPIRY);

            authService.signUp(request);

            verify(beInternalClient).createUser(
                    argThat(req ->
                            req.userId().equals(USER_ID) &&
                            req.email().equals(EMAIL) &&
                            req.name().equals(NAME) &&
                            req.nickname().equals(NICKNAME) &&
                            req.phoneNumber().equals(PHONE) &&
                            req.role() == AuthUser.Role.USER &&
                            req.userNo().startsWith("TK-") &&
                            req.userNo().length() == 11
                    )
            );
        }
    }

    // ── kakaoLogin ───────────────────────────────────────────────
    @Nested
    @DisplayName("카카오 로그인 (kakaoLogin)")
    class KakaoLoginTest {

        @Test
        @DisplayName("기존 카카오 사용자 로그인 시 토큰을 반환한다")
        void kakaoLogin_existingUser_success() {
            given(kakaoOAuthClient.requestToken(KAKAO_CODE)).willReturn(kakaoTokenResponse());
            given(kakaoOAuthClient.requestUserInfo(KAKAO_ACCESS)).willReturn(kakaoUserInfoResponse(EMAIL, NICKNAME));
            given(authUserRepository.findByOauthProviderAndOauthProviderUserId(
                    AuthUser.OAuthProvider.KAKAO,
                    KAKAO_ID.toString()
            )).willReturn(Optional.of(kakaoAuthUser));
            given(jwtProvider.issueAccessToken(USER_ID, AuthUser.Role.USER)).willReturn(ACCESS_TOKEN);
            given(jwtProvider.issueRefreshToken(USER_ID)).willReturn(REFRESH_TOKEN);
            given(jwtProvider.getRefreshTokenExpirySeconds()).willReturn(REFRESH_EXPIRY);

            TokenResponse response = authService.kakaoLogin(KAKAO_CODE);

            assertThat(response.accessToken()).isEqualTo(ACCESS_TOKEN);
            assertThat(response.refreshToken()).isEqualTo(REFRESH_TOKEN);
            verify(authUserRepository, never()).save(any());
            verify(beInternalClient, never()).createUser(any());
        }

        @Test
        @DisplayName("신규 카카오 사용자 로그인 시 Auth/BE 사용자를 생성하고 토큰을 반환한다")
        void kakaoLogin_newUser_success() {
            given(kakaoOAuthClient.requestToken(KAKAO_CODE)).willReturn(kakaoTokenResponse());
            given(kakaoOAuthClient.requestUserInfo(KAKAO_ACCESS)).willReturn(kakaoUserInfoResponse(EMAIL, NICKNAME));
            given(authUserRepository.findByOauthProviderAndOauthProviderUserId(
                    AuthUser.OAuthProvider.KAKAO,
                    KAKAO_ID.toString()
            )).willReturn(Optional.empty());
            given(authUserRepository.existsByEmail(EMAIL)).willReturn(false);
            given(authUserRepository.save(any(AuthUser.class))).willReturn(kakaoAuthUser);
            willDoNothing().given(beInternalClient).createUser(any(CreateUserRequest.class));
            given(jwtProvider.issueAccessToken(USER_ID, AuthUser.Role.USER)).willReturn(ACCESS_TOKEN);
            given(jwtProvider.issueRefreshToken(USER_ID)).willReturn(REFRESH_TOKEN);
            given(jwtProvider.getRefreshTokenExpirySeconds()).willReturn(REFRESH_EXPIRY);

            TokenResponse response = authService.kakaoLogin(KAKAO_CODE);

            assertThat(response.userId()).isEqualTo(USER_ID);
            verify(authUserRepository).save(argThat(user ->
                    user.getEmail().equals(EMAIL) &&
                    user.getRole() == AuthUser.Role.USER &&
                    user.getOauthProvider() == AuthUser.OAuthProvider.KAKAO &&
                    user.getOauthProviderUserId().equals(KAKAO_ID.toString())
            ));
            verify(beInternalClient).createUser(argThat(req ->
                    req.userId().equals(USER_ID) &&
                    req.email().equals(EMAIL) &&
                    req.name().equals(NICKNAME) &&
                    req.nickname().equals(NICKNAME) &&
                    req.phoneNumber() == null &&
                    req.role() == AuthUser.Role.USER
            ));
        }

        @Test
        @DisplayName("동일 이메일 계정이 이미 있으면 DUPLICATE_EMAIL 예외를 던진다")
        void kakaoLogin_duplicateEmail_throwsException() {
            given(kakaoOAuthClient.requestToken(KAKAO_CODE)).willReturn(kakaoTokenResponse());
            given(kakaoOAuthClient.requestUserInfo(KAKAO_ACCESS)).willReturn(kakaoUserInfoResponse(EMAIL, NICKNAME));
            given(authUserRepository.findByOauthProviderAndOauthProviderUserId(
                    AuthUser.OAuthProvider.KAKAO,
                    KAKAO_ID.toString()
            )).willReturn(Optional.empty());
            given(authUserRepository.existsByEmail(EMAIL)).willReturn(true);

            assertThatThrownBy(() -> authService.kakaoLogin(KAKAO_CODE))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.DUPLICATE_EMAIL));

            verify(authUserRepository, never()).save(any());
        }

        @Test
        @DisplayName("카카오 이메일 동의가 없으면 KAKAO_EMAIL_REQUIRED 예외를 던진다")
        void kakaoLogin_emailMissing_throwsException() {
            given(kakaoOAuthClient.requestToken(KAKAO_CODE)).willReturn(kakaoTokenResponse());
            given(kakaoOAuthClient.requestUserInfo(KAKAO_ACCESS)).willReturn(kakaoUserInfoResponse(null, NICKNAME));
            given(authUserRepository.findByOauthProviderAndOauthProviderUserId(
                    AuthUser.OAuthProvider.KAKAO,
                    KAKAO_ID.toString()
            )).willReturn(Optional.empty());

            assertThatThrownBy(() -> authService.kakaoLogin(KAKAO_CODE))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.KAKAO_EMAIL_REQUIRED));
        }

        @Test
        @DisplayName("BE 내부 사용자 생성 실패 시 INTERNAL_SERVER_ERROR 예외를 던진다")
        void kakaoLogin_beCallFails_throwsInternalServerError() {
            given(kakaoOAuthClient.requestToken(KAKAO_CODE)).willReturn(kakaoTokenResponse());
            given(kakaoOAuthClient.requestUserInfo(KAKAO_ACCESS)).willReturn(kakaoUserInfoResponse(EMAIL, NICKNAME));
            given(authUserRepository.findByOauthProviderAndOauthProviderUserId(
                    AuthUser.OAuthProvider.KAKAO,
                    KAKAO_ID.toString()
            )).willReturn(Optional.empty());
            given(authUserRepository.existsByEmail(EMAIL)).willReturn(false);
            given(authUserRepository.save(any(AuthUser.class))).willReturn(kakaoAuthUser);
            willThrow(new RuntimeException("BE 연결 실패"))
                    .given(beInternalClient).createUser(any(CreateUserRequest.class));

            assertThatThrownBy(() -> authService.kakaoLogin(KAKAO_CODE))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(GlobalErrorCode.INTERNAL_SERVER_ERROR));

            verify(jwtProvider, never()).issueAccessToken(any(), any());
        }
    }

    // ── login ────────────────────────────────────────────────────
    @Nested
    @DisplayName("로그인 (login)")
    class LoginTest {

        private LoginRequest loginRequest;

        @BeforeEach
        void setUp() {
            loginRequest = new LoginRequest(EMAIL, PASSWORD);
        }

        @Test
        @DisplayName("정상 로그인 시 토큰을 반환한다")
        void login_success() {
            given(authUserRepository.findByEmail(EMAIL)).willReturn(Optional.of(userAuthUser));
            given(passwordEncoder.matches(PASSWORD, ENCODED_PW)).willReturn(true);
            given(jwtProvider.issueAccessToken(USER_ID, AuthUser.Role.USER)).willReturn(ACCESS_TOKEN);
            given(jwtProvider.issueRefreshToken(USER_ID)).willReturn(REFRESH_TOKEN);
            given(jwtProvider.getRefreshTokenExpirySeconds()).willReturn(REFRESH_EXPIRY);

            TokenResponse response = authService.login(loginRequest);

            assertThat(response.accessToken()).isEqualTo(ACCESS_TOKEN);
            assertThat(response.refreshToken()).isEqualTo(REFRESH_TOKEN);
        }

        @Test
        @DisplayName("존재하지 않는 이메일로 로그인 시 USER_NOT_FOUND 예외를 던진다")
        void login_userNotFound_throwsException() {
            given(authUserRepository.findByEmail(EMAIL)).willReturn(Optional.empty());

            assertThatThrownBy(() -> authService.login(loginRequest))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.USER_NOT_FOUND));
        }

        @Test
        @DisplayName("비밀번호가 틀리면 INVALID_PASSWORD 예외를 던진다")
        void login_invalidPassword_throwsException() {
            given(authUserRepository.findByEmail(EMAIL)).willReturn(Optional.of(userAuthUser));
            given(passwordEncoder.matches(PASSWORD, ENCODED_PW)).willReturn(false);

            assertThatThrownBy(() -> authService.login(loginRequest))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.INVALID_PASSWORD));
        }
    }

    // ── logout ───────────────────────────────────────────────────
    @Nested
    @DisplayName("로그아웃 (logout)")
    class LogoutTest {

        @Test
        @DisplayName("유효한 토큰으로 로그아웃 시 Refresh Token 삭제 + Access Token 블랙리스트 등록")
        void logout_validToken_success() {
            Claims claims = mockClaims(USER_ID.toString());
            given(jwtProvider.parseClaims(ACCESS_TOKEN)).willReturn(claims);
            given(jwtProvider.getRemainingExpirySeconds(ACCESS_TOKEN)).willReturn(900L);

            authService.logout(ACCESS_TOKEN);

            verify(redisTokenStore).deleteRefreshToken(USER_ID);
            verify(redisTokenStore).blacklistAccessToken(ACCESS_TOKEN, 900L);
        }

        @Test
        @DisplayName("만료된 토큰으로 로그아웃 시 Refresh Token만 삭제")
        void logout_expiredToken_onlyDeletesRefreshToken() {
            Claims expiredClaims = mockClaims(USER_ID.toString());
            given(jwtProvider.parseClaims(ACCESS_TOKEN))
                    .willThrow(new ExpiredJwtException(null, expiredClaims, "만료됨"));

            authService.logout(ACCESS_TOKEN);

            verify(redisTokenStore).deleteRefreshToken(USER_ID);
            verify(redisTokenStore, never()).blacklistAccessToken(any(), anyLong());
        }

        @Test
        @DisplayName("유효하지 않은 토큰으로 로그아웃 시 INVALID_TOKEN 예외를 던진다")
        void logout_invalidToken_throwsException() {
            given(jwtProvider.parseClaims(ACCESS_TOKEN))
                    .willThrow(new RuntimeException("유효하지 않은 토큰"));

            assertThatThrownBy(() -> authService.logout(ACCESS_TOKEN))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.INVALID_TOKEN));
        }
    }

    // ── reissue ──────────────────────────────────────────────────
    @Nested
    @DisplayName("토큰 재발급 (reissue)")
    class ReissueTest {

        private ReissueRequest reissueRequest;

        @BeforeEach
        void setUp() {
            reissueRequest = new ReissueRequest(REFRESH_TOKEN);
        }

        @Test
        @DisplayName("정상 재발급 시 새 토큰을 반환하고 Rotation이 적용된다")
        void reissue_success_withRotation() {
            given(jwtProvider.extractUserId(REFRESH_TOKEN)).willReturn(USER_ID);
            given(redisTokenStore.findRefreshToken(USER_ID)).willReturn(Optional.of(REFRESH_TOKEN));
            given(authUserRepository.findById(USER_ID)).willReturn(Optional.of(userAuthUser));
            given(jwtProvider.issueAccessToken(USER_ID, AuthUser.Role.USER)).willReturn(NEW_ACCESS);
            given(jwtProvider.issueRefreshToken(USER_ID)).willReturn(NEW_REFRESH);
            given(jwtProvider.getRefreshTokenExpirySeconds()).willReturn(REFRESH_EXPIRY);

            TokenResponse response = authService.reissue(reissueRequest);

            assertThat(response.accessToken()).isEqualTo(NEW_ACCESS);
            assertThat(response.refreshToken()).isEqualTo(NEW_REFRESH);
            verify(redisTokenStore).saveRefreshToken(USER_ID, NEW_REFRESH, REFRESH_EXPIRY);
        }

        @Test
        @DisplayName("만료된 Refresh Token으로 재발급 시 EXPIRED_TOKEN 예외를 던진다")
        void reissue_expiredRefreshToken_throwsException() {
            given(jwtProvider.extractUserId(REFRESH_TOKEN))
                    .willThrow(new ExpiredJwtException(null, null, "만료됨"));

            assertThatThrownBy(() -> authService.reissue(reissueRequest))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.EXPIRED_TOKEN));
        }

        @Test
        @DisplayName("Redis에 Refresh Token이 없으면 REFRESH_TOKEN_NOT_FOUND 예외를 던진다")
        void reissue_refreshTokenNotFound_throwsException() {
            given(jwtProvider.extractUserId(REFRESH_TOKEN)).willReturn(USER_ID);
            given(redisTokenStore.findRefreshToken(USER_ID)).willReturn(Optional.empty());

            assertThatThrownBy(() -> authService.reissue(reissueRequest))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.REFRESH_TOKEN_NOT_FOUND));
        }

        @Test
        @DisplayName("Refresh Token 불일치 시 REFRESH_TOKEN_MISMATCH 예외를 던진다")
        void reissue_refreshTokenMismatch_throwsException() {
            given(jwtProvider.extractUserId(REFRESH_TOKEN)).willReturn(USER_ID);
            given(redisTokenStore.findRefreshToken(USER_ID)).willReturn(Optional.of("different.token"));

            assertThatThrownBy(() -> authService.reissue(reissueRequest))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.REFRESH_TOKEN_MISMATCH));
        }
    }

    private Claims mockClaims(String subject) {
        Claims claims = mock(Claims.class);
        given(claims.getSubject()).willReturn(subject);
        return claims;
    }

    private KakaoTokenResponse kakaoTokenResponse() {
        return new KakaoTokenResponse(
                "bearer",
                KAKAO_ACCESS,
                43199,
                "kakao-refresh-token",
                5184000,
                "account_email profile_nickname"
        );
    }

    private KakaoUserInfoResponse kakaoUserInfoResponse(String email, String nickname) {
        return new KakaoUserInfoResponse(
                KAKAO_ID,
                new KakaoUserInfoResponse.KakaoAccount(
                        email,
                        new KakaoUserInfoResponse.Profile(nickname, null)
                ),
                null
        );
    }

    private static <T> T argThat(org.mockito.ArgumentMatcher<T> matcher) {
        return org.mockito.ArgumentMatchers.argThat(matcher);
    }
}
