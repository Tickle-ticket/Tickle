package com.ssafy.tickle.auth.user.application;

import com.ssafy.tickle.auth.common.exception.BaseException;
import com.ssafy.tickle.auth.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.auth.common.util.JwtProvider;
import com.ssafy.tickle.auth.common.util.RedisTokenStore;
import com.ssafy.tickle.auth.user.domain.AuthErrorCode;
import com.ssafy.tickle.auth.user.domain.AuthUser;
import com.ssafy.tickle.auth.user.infrastructure.client.BeInternalClient;
import com.ssafy.tickle.auth.user.infrastructure.client.dto.CreateUserRequest;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * AuthService 단위 테스트입니다.
 *
 * <p>Spring Context 없이 Mockito만 사용해 빠른 단위 테스트를 수행한다.</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService 단위 테스트")
class AuthServiceTest {

    @Mock private AuthUserRepository authUserRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtProvider jwtProvider;
    @Mock private RedisTokenStore redisTokenStore;
    @Mock private BeInternalClient beInternalClient;

    @InjectMocks private AuthService authService;

    // ── 공통 픽스처 ──────────────────────────────────────────────
    private static final Long   USER_ID         = 1L;
    private static final String EMAIL           = "test@example.com";
    private static final String PASSWORD        = "Password1!";
    private static final String ENCODED_PW      = "$2a$10$encoded";
    private static final String ACCESS_TOKEN    = "access.token.jwt";
    private static final String REFRESH_TOKEN   = "refresh.token.jwt";
    private static final String NEW_ACCESS      = "new.access.jwt";
    private static final String NEW_REFRESH     = "new.refresh.jwt";
    private static final String NAME            = "홍길동";
    private static final String NICKNAME        = "길동이";
    private static final long   REFRESH_EXPIRY  = 604800L;

    private AuthUser authUser;

    @BeforeEach
    void setUp() {
        authUser = AuthUser.builder()
                .email(EMAIL)
                .password(ENCODED_PW)
                .role(AuthUser.Role.USER)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        ReflectionTestUtils.setField(authUser, "id", USER_ID);
    }

    // ── signUp ───────────────────────────────────────────────────
    @Nested
    @DisplayName("회원가입 (signUp)")
    class SignUpTest {

        private SignUpRequest signUpRequest;

        @BeforeEach
        void setUp() {
            signUpRequest = new SignUpRequest(EMAIL, PASSWORD, NAME, NICKNAME);
        }

        @Test
        @DisplayName("정상 회원가입 시 토큰을 반환한다")
        void signUp_success() {
            // given
            given(authUserRepository.existsByEmail(EMAIL)).willReturn(false);
            given(passwordEncoder.encode(PASSWORD)).willReturn(ENCODED_PW);
            given(authUserRepository.save(any(AuthUser.class))).willReturn(authUser);
            willDoNothing().given(beInternalClient).createUser(any(CreateUserRequest.class));
            given(jwtProvider.issueAccessToken(USER_ID, AuthUser.Role.USER)).willReturn(ACCESS_TOKEN);
            given(jwtProvider.issueRefreshToken(USER_ID)).willReturn(REFRESH_TOKEN);
            given(jwtProvider.getRefreshTokenExpirySeconds()).willReturn(REFRESH_EXPIRY);

            // when
            TokenResponse response = authService.signUp(signUpRequest);

            // then
            assertThat(response.accessToken()).isEqualTo(ACCESS_TOKEN);
            assertThat(response.refreshToken()).isEqualTo(REFRESH_TOKEN);
            assertThat(response.userId()).isEqualTo(USER_ID);

            verify(redisTokenStore).saveRefreshToken(USER_ID, REFRESH_TOKEN, REFRESH_EXPIRY);
            verify(beInternalClient).createUser(any(CreateUserRequest.class));
        }

        @Test
        @DisplayName("이메일이 중복되면 DUPLICATE_EMAIL 예외를 던진다")
        void signUp_duplicateEmail_throwsException() {
            // given
            given(authUserRepository.existsByEmail(EMAIL)).willReturn(true);

            // when & then
            assertThatThrownBy(() -> authService.signUp(signUpRequest))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.DUPLICATE_EMAIL));

            verify(authUserRepository, never()).save(any());
            verify(beInternalClient, never()).createUser(any());
        }

        @Test
        @DisplayName("BE 내부 API 호출 실패 시 INTERNAL_SERVER_ERROR 예외를 던진다")
        void signUp_beCallFails_throwsInternalServerError() {
            // given
            given(authUserRepository.existsByEmail(EMAIL)).willReturn(false);
            given(passwordEncoder.encode(PASSWORD)).willReturn(ENCODED_PW);
            given(authUserRepository.save(any(AuthUser.class))).willReturn(authUser);
            willThrow(new RuntimeException("BE 연결 실패"))
                    .given(beInternalClient).createUser(any(CreateUserRequest.class));

            // when & then
            assertThatThrownBy(() -> authService.signUp(signUpRequest))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(GlobalErrorCode.INTERNAL_SERVER_ERROR));

            // 토큰 발급 및 Redis 저장이 호출되지 않아야 한다
            verify(jwtProvider, never()).issueAccessToken(any(), any());
            verify(redisTokenStore, never()).saveRefreshToken(any(), any(), anyLong());
        }

        @Test
        @DisplayName("회원가입 시 CreateUserRequest에 올바른 데이터가 전달된다")
        void signUp_createsUserRequestWithCorrectData() {
            // given
            given(authUserRepository.existsByEmail(EMAIL)).willReturn(false);
            given(passwordEncoder.encode(PASSWORD)).willReturn(ENCODED_PW);
            given(authUserRepository.save(any(AuthUser.class))).willReturn(authUser);
            willDoNothing().given(beInternalClient).createUser(any(CreateUserRequest.class));
            given(jwtProvider.issueAccessToken(any(), any())).willReturn(ACCESS_TOKEN);
            given(jwtProvider.issueRefreshToken(any())).willReturn(REFRESH_TOKEN);
            given(jwtProvider.getRefreshTokenExpirySeconds()).willReturn(REFRESH_EXPIRY);

            // when
            authService.signUp(signUpRequest);

            // then: CreateUserRequest의 userId, email, name, nickname이 올바르게 전달됨
            verify(beInternalClient).createUser(
                    argThat(req ->
                            req.userId().equals(USER_ID) &&
                            req.email().equals(EMAIL) &&
                            req.name().equals(NAME) &&
                            req.nickname().equals(NICKNAME) &&
                            req.userNo().startsWith("TK-") &&
                            req.userNo().length() == 11   // "TK-" + 8자
                    )
            );
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
            // given
            given(authUserRepository.findByEmail(EMAIL)).willReturn(Optional.of(authUser));
            given(passwordEncoder.matches(PASSWORD, ENCODED_PW)).willReturn(true);
            given(jwtProvider.issueAccessToken(USER_ID, AuthUser.Role.USER)).willReturn(ACCESS_TOKEN);
            given(jwtProvider.issueRefreshToken(USER_ID)).willReturn(REFRESH_TOKEN);
            given(jwtProvider.getRefreshTokenExpirySeconds()).willReturn(REFRESH_EXPIRY);

            // when
            TokenResponse response = authService.login(loginRequest);

            // then
            assertThat(response.accessToken()).isEqualTo(ACCESS_TOKEN);
            assertThat(response.refreshToken()).isEqualTo(REFRESH_TOKEN);
            assertThat(response.userId()).isEqualTo(USER_ID);
        }

        @Test
        @DisplayName("존재하지 않는 이메일로 로그인 시 USER_NOT_FOUND 예외를 던진다")
        void login_userNotFound_throwsException() {
            // given
            given(authUserRepository.findByEmail(EMAIL)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> authService.login(loginRequest))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.USER_NOT_FOUND));

            verify(passwordEncoder, never()).matches(any(), any());
        }

        @Test
        @DisplayName("비밀번호가 틀리면 INVALID_PASSWORD 예외를 던진다")
        void login_invalidPassword_throwsException() {
            // given
            given(authUserRepository.findByEmail(EMAIL)).willReturn(Optional.of(authUser));
            given(passwordEncoder.matches(PASSWORD, ENCODED_PW)).willReturn(false);

            // when & then
            assertThatThrownBy(() -> authService.login(loginRequest))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.INVALID_PASSWORD));

            verify(jwtProvider, never()).issueAccessToken(any(), any());
        }
    }

    // ── logout ───────────────────────────────────────────────────
    @Nested
    @DisplayName("로그아웃 (logout)")
    class LogoutTest {

        @Test
        @DisplayName("유효한 토큰으로 로그아웃 시 Refresh Token 삭제 + Access Token 블랙리스트 등록")
        void logout_validToken_success() {
            // given
            Claims claims = mockClaims(USER_ID.toString());
            given(jwtProvider.parseClaims(ACCESS_TOKEN)).willReturn(claims);
            given(jwtProvider.getRemainingExpirySeconds(ACCESS_TOKEN)).willReturn(900L);

            // when
            authService.logout(ACCESS_TOKEN);

            // then
            verify(redisTokenStore).deleteRefreshToken(USER_ID);
            verify(redisTokenStore).blacklistAccessToken(ACCESS_TOKEN, 900L);
        }

        @Test
        @DisplayName("만료된 토큰으로 로그아웃 시 Refresh Token만 삭제하고 블랙리스트 등록 안 함")
        void logout_expiredToken_onlyDeletesRefreshToken() {
            // given
            // ExpiredJwtException은 claims 정보를 포함한다
            Claims expiredClaims = mockClaims(USER_ID.toString());
            given(jwtProvider.parseClaims(ACCESS_TOKEN))
                    .willThrow(new ExpiredJwtException(null, expiredClaims, "만료됨"));

            // when
            authService.logout(ACCESS_TOKEN);

            // then: Refresh Token은 삭제, 블랙리스트 등록은 하지 않음 (remainingSeconds = 0)
            verify(redisTokenStore).deleteRefreshToken(USER_ID);
            verify(redisTokenStore, never()).blacklistAccessToken(any(), anyLong());
        }

        @Test
        @DisplayName("유효하지 않은 토큰으로 로그아웃 시 INVALID_TOKEN 예외를 던진다")
        void logout_invalidToken_throwsException() {
            // given
            given(jwtProvider.parseClaims(ACCESS_TOKEN))
                    .willThrow(new RuntimeException("유효하지 않은 토큰"));

            // when & then
            assertThatThrownBy(() -> authService.logout(ACCESS_TOKEN))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.INVALID_TOKEN));

            verify(redisTokenStore, never()).deleteRefreshToken(any());
            verify(redisTokenStore, never()).blacklistAccessToken(any(), anyLong());
        }

        @Test
        @DisplayName("잔여 유효 시간이 0이면 블랙리스트에 등록하지 않는다")
        void logout_zeroRemainingTime_doesNotBlacklist() {
            // given
            Claims claims = mockClaims(USER_ID.toString());
            given(jwtProvider.parseClaims(ACCESS_TOKEN)).willReturn(claims);
            given(jwtProvider.getRemainingExpirySeconds(ACCESS_TOKEN)).willReturn(0L);

            // when
            authService.logout(ACCESS_TOKEN);

            // then
            verify(redisTokenStore).deleteRefreshToken(USER_ID);
            verify(redisTokenStore, never()).blacklistAccessToken(any(), anyLong());
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
            // given
            given(jwtProvider.extractUserId(REFRESH_TOKEN)).willReturn(USER_ID);
            given(redisTokenStore.findRefreshToken(USER_ID)).willReturn(Optional.of(REFRESH_TOKEN));
            given(authUserRepository.findById(USER_ID)).willReturn(Optional.of(authUser));
            given(jwtProvider.issueAccessToken(USER_ID, AuthUser.Role.USER)).willReturn(NEW_ACCESS);
            given(jwtProvider.issueRefreshToken(USER_ID)).willReturn(NEW_REFRESH);
            given(jwtProvider.getRefreshTokenExpirySeconds()).willReturn(REFRESH_EXPIRY);

            // when
            TokenResponse response = authService.reissue(reissueRequest);

            // then
            assertThat(response.accessToken()).isEqualTo(NEW_ACCESS);
            assertThat(response.refreshToken()).isEqualTo(NEW_REFRESH);
            assertThat(response.userId()).isEqualTo(USER_ID);

            // Rotation: 새 Refresh Token으로 덮어씀
            verify(redisTokenStore).saveRefreshToken(USER_ID, NEW_REFRESH, REFRESH_EXPIRY);
        }

        @Test
        @DisplayName("만료된 Refresh Token으로 재발급 시 EXPIRED_TOKEN 예외를 던진다")
        void reissue_expiredRefreshToken_throwsException() {
            // given
            given(jwtProvider.extractUserId(REFRESH_TOKEN))
                    .willThrow(new ExpiredJwtException(null, null, "만료됨"));

            // when & then
            assertThatThrownBy(() -> authService.reissue(reissueRequest))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.EXPIRED_TOKEN));
        }

        @Test
        @DisplayName("Redis에 Refresh Token이 없으면 REFRESH_TOKEN_NOT_FOUND 예외를 던진다")
        void reissue_refreshTokenNotFound_throwsException() {
            // given
            given(jwtProvider.extractUserId(REFRESH_TOKEN)).willReturn(USER_ID);
            given(redisTokenStore.findRefreshToken(USER_ID)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> authService.reissue(reissueRequest))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.REFRESH_TOKEN_NOT_FOUND));
        }

        @Test
        @DisplayName("Redis의 Refresh Token과 요청 토큰이 다르면 REFRESH_TOKEN_MISMATCH 예외를 던진다")
        void reissue_refreshTokenMismatch_throwsException() {
            // given
            given(jwtProvider.extractUserId(REFRESH_TOKEN)).willReturn(USER_ID);
            given(redisTokenStore.findRefreshToken(USER_ID)).willReturn(Optional.of("different.token"));

            // when & then
            assertThatThrownBy(() -> authService.reissue(reissueRequest))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.REFRESH_TOKEN_MISMATCH));
        }

        @Test
        @DisplayName("유효하지 않은 Refresh Token이면 INVALID_TOKEN 예외를 던진다")
        void reissue_invalidToken_throwsException() {
            // given
            given(jwtProvider.extractUserId(REFRESH_TOKEN))
                    .willThrow(new RuntimeException("유효하지 않은 토큰"));

            // when & then
            assertThatThrownBy(() -> authService.reissue(reissueRequest))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.INVALID_TOKEN));
        }
    }

    // ── 헬퍼 메서드 ──────────────────────────────────────────────

    /**
     * 지정한 subject를 가진 Claims mock을 생성합니다.
     */
    private Claims mockClaims(String subject) {
        Claims claims = mock(Claims.class);
        given(claims.getSubject()).willReturn(subject);
        return claims;
    }

    /**
     * argThat 임포트를 위한 정적 메서드 위임입니다.
     */
    private static <T> T argThat(org.mockito.ArgumentMatcher<T> matcher) {
        return org.mockito.ArgumentMatchers.argThat(matcher);
    }
}
