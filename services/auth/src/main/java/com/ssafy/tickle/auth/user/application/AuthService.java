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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * 인증 관련 비즈니스 로직을 처리하는 서비스 클래스입니다.
 *
 * <p>회원가입, 로그인, 로그아웃, Access Token 재발급을 담당한다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final AuthUserRepository authUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final RedisTokenStore redisTokenStore;
    private final BeInternalClient beInternalClient;
    private final PhoneVerificationService phoneVerificationService;
    private final KakaoOAuthClient kakaoOAuthClient;

    /**
     * 자체 회원가입을 처리합니다.
     *
     * <p>일반 회원(USER)과 기획사(ORGANIZER) 모두 처리한다.</p>
     * <ul>
     *   <li>이메일·전화번호 중복 검사</li>
     *   <li>휴대폰 인증 완료 여부 확인 (Redis)</li>
     *   <li>role 기반 필수 필드 검증 (USER: nickname 필수, ORGANIZER: organizerName 필수)</li>
     *   <li>tickle_auth.users 생성 후 BE 내부 API로 tickle_core.users 생성</li>
     * </ul>
     *
     * @param request 회원가입 요청
     * @return 발급된 Access Token / Refresh Token / userId
     */
    @Transactional
    public TokenResponse signUp(SignUpRequest request) {
        validateSignUpRequest(request);

        Instant now = Instant.now();
        AuthUser authUser = AuthUser.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .role(request.role())
                .phoneNumber(request.phoneNumber())
                .createdAt(now)
                .updatedAt(now)
                .build();

        AuthUser saved = authUserRepository.save(authUser);

        String userNo = generateUserNo();
        try {
            beInternalClient.createUser(new CreateUserRequest(
                    saved.getId(),
                    userNo,
                    request.email(),
                    request.name(),
                    request.nickname(),
                    request.phoneNumber(),
                    request.role(),
                    request.organizerName(),
                    request.birthDate()
            ));
        } catch (Exception e) {
            log.error("BE 내부 사용자 생성 실패, 트랜잭션 롤백 예정: userId={}", saved.getId(), e);
            throw new BaseException(GlobalErrorCode.INTERNAL_SERVER_ERROR);
        }

        // 회원가입 완료 후 인증 완료 상태 제거
        phoneVerificationService.clearVerified(request.phoneNumber());

        return issueTokens(saved);
    }

    /**
     * 자체 로그인을 처리합니다.
     *
     * @param request 로그인 요청 (email, password)
     * @return 발급된 Access Token / Refresh Token / userId
     */
    public TokenResponse login(LoginRequest request) {
        AuthUser authUser = authUserRepository.findByEmail(request.email())
                .orElseThrow(() -> new BaseException(AuthErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.password(), authUser.getPassword())) {
            throw new BaseException(AuthErrorCode.INVALID_PASSWORD);
        }

        return issueTokens(authUser);
    }

    /**
     * Kakao 인가 코드 요청 URL을 생성합니다.
     *
     * @return Kakao 로그인 페이지 URL
     */
    public String getKakaoAuthorizeUrl() {
        return kakaoOAuthClient.buildAuthorizeUrl();
    }

    /**
     * Kakao OAuth 콜백을 처리하고 Tickle JWT를 발급합니다.
     *
     * <p>Kakao 사용자 식별자로 기존 OAuth 가입자를 찾고, 없으면 USER 권한의 신규 회원을 생성한다.</p>
     *
     * @param code Kakao authorization code
     * @return 발급된 Access Token / Refresh Token / userId
     */
    @Transactional
    public TokenResponse kakaoLogin(String code) {
        if (isBlank(code)) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST);
        }

        KakaoTokenResponse tokenResponse = kakaoOAuthClient.requestToken(code);
        if (tokenResponse == null || isBlank(tokenResponse.accessToken())) {
            throw new BaseException(AuthErrorCode.KAKAO_LOGIN_FAILED);
        }

        KakaoUserInfoResponse userInfo = kakaoOAuthClient.requestUserInfo(tokenResponse.accessToken());
        if (userInfo == null || userInfo.id() == null) {
            throw new BaseException(AuthErrorCode.KAKAO_LOGIN_FAILED);
        }

        String providerUserId = userInfo.id().toString();
        AuthUser authUser = authUserRepository
                .findByOauthProviderAndOauthProviderUserId(AuthUser.OAuthProvider.KAKAO, providerUserId)
                .orElseGet(() -> createKakaoUser(userInfo, providerUserId));

        return issueTokens(authUser);
    }

    /**
     * 로그아웃을 처리합니다.
     *
     * <p>Refresh Token을 Redis에서 삭제하고, 잔여 유효 시간이 남은 Access Token을 블랙리스트에 등록한다.</p>
     *
     * @param accessToken Authorization 헤더에서 추출한 Access Token (Bearer 제거 후)
     */
    public void logout(String accessToken) {
        Long userId;
        long remainingSeconds;

        try {
            Claims claims = jwtProvider.parseClaims(accessToken);
            userId = Long.parseLong(claims.getSubject());
            remainingSeconds = jwtProvider.getRemainingExpirySeconds(accessToken);
        } catch (ExpiredJwtException e) {
            userId = Long.parseLong(e.getClaims().getSubject());
            remainingSeconds = 0;
        } catch (Exception e) {
            throw new BaseException(AuthErrorCode.INVALID_TOKEN);
        }

        redisTokenStore.deleteRefreshToken(userId);

        if (remainingSeconds > 0) {
            redisTokenStore.blacklistAccessToken(accessToken, remainingSeconds);
        }
    }

    /**
     * Access Token을 재발급합니다.
     *
     * <p>Refresh Token 유효성 검증 후 Access Token / Refresh Token을 모두 재발급한다 (Rotation).</p>
     *
     * @param request 재발급 요청 (refreshToken)
     * @return 새로 발급된 Access Token / Refresh Token / userId
     */
    public TokenResponse reissue(ReissueRequest request) {
        Long userId;

        try {
            userId = jwtProvider.extractUserId(request.refreshToken());
        } catch (ExpiredJwtException e) {
            throw new BaseException(AuthErrorCode.EXPIRED_TOKEN);
        } catch (Exception e) {
            throw new BaseException(AuthErrorCode.INVALID_TOKEN);
        }

        String storedRefreshToken = redisTokenStore.findRefreshToken(userId)
                .orElseThrow(() -> new BaseException(AuthErrorCode.REFRESH_TOKEN_NOT_FOUND));

        if (!storedRefreshToken.equals(request.refreshToken())) {
            throw new BaseException(AuthErrorCode.REFRESH_TOKEN_MISMATCH);
        }

        AuthUser authUser = authUserRepository.findById(userId)
                .orElseThrow(() -> new BaseException(AuthErrorCode.USER_NOT_FOUND));

        return issueTokens(authUser);
    }

    /**
     * 회원가입 요청의 유효성을 검증합니다.
     *
     * <p>중복 검사, 휴대폰 인증 완료 여부, role 기반 필수 필드를 확인한다.</p>
     *
     * @param request 회원가입 요청
     */
    private void validateSignUpRequest(SignUpRequest request) {
        if (authUserRepository.existsByEmail(request.email())) {
            throw new BaseException(AuthErrorCode.DUPLICATE_EMAIL);
        }
        if (authUserRepository.existsByPhoneNumber(request.phoneNumber())) {
            throw new BaseException(AuthErrorCode.DUPLICATE_PHONE);
        }
        if (!phoneVerificationService.isVerified(request.phoneNumber())) {
            throw new BaseException(AuthErrorCode.PHONE_NOT_VERIFIED);
        }
        if (request.role() == AuthUser.Role.USER && isBlank(request.nickname())) {
            throw new BaseException(AuthErrorCode.NICKNAME_REQUIRED);
        }
        if (request.role() == AuthUser.Role.ORGANIZER && isBlank(request.organizerName())) {
            throw new BaseException(AuthErrorCode.ORGANIZER_NAME_REQUIRED);
        }
    }

    /**
     * Kakao 사용자 정보로 신규 회원을 생성합니다.
     *
     * @param userInfo Kakao 사용자 정보
     * @param providerUserId Kakao 사용자 식별자
     * @return 생성된 AuthUser
     */
    private AuthUser createKakaoUser(KakaoUserInfoResponse userInfo, String providerUserId) {
        String email = userInfo.email();
        if (isBlank(email)) {
            email = "kakao_" + providerUserId + "@oauth.kakao";
        } else if (authUserRepository.existsByEmail(email)) {
            throw new BaseException(AuthErrorCode.DUPLICATE_EMAIL);
        }

        Instant now = Instant.now();
        AuthUser saved = authUserRepository.save(AuthUser.builder()
                .email(email)
                .role(AuthUser.Role.USER)
                .oauthProvider(AuthUser.OAuthProvider.KAKAO)
                .oauthProviderUserId(providerUserId)
                .createdAt(now)
                .updatedAt(now)
                .build());

        String nickname = resolveKakaoNickname(userInfo, providerUserId);
        try {
            beInternalClient.createUser(new CreateUserRequest(
                    saved.getId(),
                    generateUserNo(),
                    email,
                    nickname,
                    nickname,
                    null,
                    saved.getRole(),
                    null,
                    null
            ));
        } catch (Exception e) {
            log.error("BE 내부 Kakao 사용자 생성 실패, 트랜잭션 롤백 예정: userId={}", saved.getId(), e);
            throw new BaseException(GlobalErrorCode.INTERNAL_SERVER_ERROR);
        }

        return saved;
    }

    /**
     * Kakao 프로필 닉네임을 서비스 필수 프로필 값으로 변환합니다.
     *
     * @param userInfo Kakao 사용자 정보
     * @param providerUserId Kakao 사용자 식별자
     * @return 서비스 닉네임
     */
    private String resolveKakaoNickname(KakaoUserInfoResponse userInfo, String providerUserId) {
        String nickname = userInfo.nickname();
        if (!isBlank(nickname)) {
            return nickname;
        }
        return "kakao_" + providerUserId;
    }

    /**
     * 토큰을 발급하고 Refresh Token을 Redis에 저장합니다.
     *
     * @param authUser 인증 사용자 엔티티
     * @return 발급된 토큰 응답
     */
    private TokenResponse issueTokens(AuthUser authUser) {
        String accessToken = jwtProvider.issueAccessToken(authUser.getId(), authUser.getRole());
        String refreshToken = jwtProvider.issueRefreshToken(authUser.getId());
        redisTokenStore.saveRefreshToken(
                authUser.getId(),
                refreshToken,
                jwtProvider.getRefreshTokenExpirySeconds()
        );
        return new TokenResponse(accessToken, refreshToken, authUser.getId());
    }

    /**
     * 외부 노출용 사용자 번호를 생성합니다 (형식: TK-{UUID 앞 8자리}).
     *
     * @return 사용자 번호 (예: TK-a1b2c3d4)
     */
    private String generateUserNo() {
        return "TK-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
