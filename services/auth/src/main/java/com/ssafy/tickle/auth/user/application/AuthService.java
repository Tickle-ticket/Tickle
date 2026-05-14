package com.ssafy.tickle.auth.user.application;

import com.ssafy.tickle.auth.common.exception.BaseException;
import com.ssafy.tickle.auth.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.auth.common.util.JwtProvider;
import com.ssafy.tickle.auth.common.util.RedisTokenStore;
import com.ssafy.tickle.auth.user.application.dto.KakaoLoginResult;
import com.ssafy.tickle.auth.user.application.dto.TokenResult;
import com.ssafy.tickle.auth.user.domain.AuthErrorCode;
import com.ssafy.tickle.auth.user.domain.AuthUser;
import com.ssafy.tickle.auth.user.infrastructure.client.BeInternalClient;
import com.ssafy.tickle.auth.user.infrastructure.client.dto.CreateUserRequest;
import com.ssafy.tickle.auth.user.infrastructure.client.dto.CreateUserResponse;
import com.ssafy.tickle.auth.user.infrastructure.oauth.KakaoOAuthClient;
import com.ssafy.tickle.auth.user.infrastructure.oauth.dto.KakaoTokenResponse;
import com.ssafy.tickle.auth.user.infrastructure.oauth.dto.KakaoUserInfoResponse;
import com.ssafy.tickle.auth.user.infrastructure.persistence.AuthUserRepository;
import com.ssafy.tickle.auth.user.presentation.dto.AdminSignUpRequest;
import com.ssafy.tickle.auth.user.presentation.dto.KakaoLoginResponse;
import com.ssafy.tickle.auth.user.presentation.dto.LoginRequest;
import com.ssafy.tickle.auth.user.presentation.dto.ReissueRequest;
import com.ssafy.tickle.auth.user.presentation.dto.SignUpRequest;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.redis.core.StringRedisTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
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
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${admin.secret}")
    private String adminSecret;

    /**
     * 어드민 계정을 생성합니다.
     *
     * <p>전화번호 인증 없이 ADMIN 권한 계정을 직접 생성한다. X-Admin-Secret 헤더 검증 필수.</p>
     *
     * @param request     어드민 계정 생성 요청
     * @param secretHeader 요청 헤더에서 추출한 어드민 시크릿
     * @return 발급된 Access Token / Refresh Token / userId
     */
    @Transactional
    public TokenResult createAdminAccount(AdminSignUpRequest request, String secretHeader) {
        if (!adminSecret.equals(secretHeader)) {
            throw new BaseException(AuthErrorCode.INVALID_ADMIN_SECRET);
        }

        if (authUserRepository.existsByEmail(request.email())) {
            throw new BaseException(AuthErrorCode.DUPLICATE_EMAIL);
        }

        Instant now = Instant.now();
        AuthUser authUser = AuthUser.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .role(AuthUser.Role.ADMIN)
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
                    null,
                    AuthUser.Role.ADMIN,
                    null,
                    null
            ));
        } catch (Exception e) {
            log.error("어드민 계정 BE 사용자 생성 실패, 롤백 예정: userId={}", saved.getId(), e);
            throw new BaseException(GlobalErrorCode.INTERNAL_SERVER_ERROR);
        }

        return issueTokens(saved);
    }

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
    public TokenResult signUp(SignUpRequest request) {
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
        String resolvedNickname = isBlank(request.nickname()) ? request.name() : request.nickname();
        try {
            CreateUserResponse beResponse = beInternalClient.createUser(new CreateUserRequest(
                    saved.getId(),
                    userNo,
                    request.email(),
                    request.name(),
                    resolvedNickname,
                    request.phoneNumber(),
                    request.role(),
                    request.organizerName(),
                    request.birthDate()
            ));
            
            if (beResponse != null && beResponse.organizerId() != null) {
                saved.updateOrganizerId(beResponse.organizerId());
            }
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
    public TokenResult login(LoginRequest request) {
        AuthUser authUser = authUserRepository.findByEmail(request.email())
                .orElseThrow(() -> new BaseException(AuthErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.password(), authUser.getPassword())) {
            throw new BaseException(AuthErrorCode.INVALID_PASSWORD);
        }

        return issueTokens(authUser);
    }

    /**
     * Kakao OAuth 콜백을 처리하고 Tickle JWT를 발급하거나 회원가입을 유도합니다.
     *
     * @param request 프론트엔드가 전달한 Kakao 로그인 요청 (code, redirectUri)
     * @return 카카오 로그인 응답 (신규 유저 여부 포함)
     */
    @Transactional
    public KakaoLoginResult kakaoLogin(com.ssafy.tickle.auth.user.presentation.dto.KakaoLoginRequest request) {
        if (request == null || isBlank(request.code()) || isBlank(request.redirectUri())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST);
        }

        KakaoTokenResponse tokenResponse = kakaoOAuthClient.requestToken(request.code(), request.redirectUri());
        if (tokenResponse == null || isBlank(tokenResponse.accessToken())) {
            throw new BaseException(AuthErrorCode.KAKAO_LOGIN_FAILED);
        }

        KakaoUserInfoResponse userInfo = kakaoOAuthClient.requestUserInfo(tokenResponse.accessToken());
        if (userInfo == null || userInfo.id() == null) {
            throw new BaseException(AuthErrorCode.KAKAO_LOGIN_FAILED);
        }

        String providerUserId = userInfo.id().toString();
        Optional<AuthUser> existingUser = authUserRepository
                .findByOauthProviderAndOauthProviderUserId(AuthUser.OAuthProvider.KAKAO, providerUserId);

        if (existingUser.isPresent()) {
            TokenResult tokens = issueTokens(existingUser.get());
            KakaoLoginResponse response = new KakaoLoginResponse(
                    false,
                    null,
                    tokens.accessToken()
            );
            return new KakaoLoginResult(response, tokens.refreshToken());
        }

        // 신규 카카오 유저: 정보 임시 저장 후 가입 유도
        String signUpToken = UUID.randomUUID().toString();
        try {
            String userInfoJson = objectMapper.writeValueAsString(userInfo);
            stringRedisTemplate.opsForValue().set("kakao:signup:" + signUpToken, userInfoJson, Duration.ofMinutes(15));
        } catch (Exception e) {
            log.error("Kakao 사용자 정보 직렬화 실패", e);
            throw new BaseException(GlobalErrorCode.INTERNAL_SERVER_ERROR);
        }

        return new KakaoLoginResult(new KakaoLoginResponse(true, signUpToken, null), null);
    }

    /**
     * 신규 카카오 유저의 전화번호, 이름, 생년월일을 인증받아 가입을 완료합니다.
     *
     * @param request 카카오 가입 마무리 요청
     * @return 발급된 Access Token / Refresh Token / userId
     */
    @Transactional
    public TokenResult kakaoSignUp(com.ssafy.tickle.auth.user.presentation.dto.KakaoSignUpRequest request) {
        if (!phoneVerificationService.isVerified(request.phoneNumber())) {
            throw new BaseException(AuthErrorCode.PHONE_VERIFICATION_FAILED);
        }

        String redisKey = "kakao:signup:" + request.signUpToken();
        String userInfoJson = stringRedisTemplate.opsForValue().get(redisKey);
        if (isBlank(userInfoJson)) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST);
        }

        KakaoUserInfoResponse userInfo;
        try {
            userInfo = objectMapper.readValue(userInfoJson, KakaoUserInfoResponse.class);
        } catch (Exception e) {
            log.error("Kakao 사용자 정보 역직렬화 실패", e);
            throw new BaseException(GlobalErrorCode.INTERNAL_SERVER_ERROR);
        }

        String providerUserId = userInfo.id().toString();
        AuthUser authUser = createKakaoUser(userInfo, providerUserId, request.phoneNumber(), request.name(), request.birthDate());

        stringRedisTemplate.delete(redisKey);
        phoneVerificationService.clearVerified(request.phoneNumber());

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
    public TokenResult reissue(ReissueRequest request) {
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
     * @param phoneNumber 사용자 휴대폰 번호
     * @param name 사용자 실명
     * @param birthDate 생년월일
     * @return 생성된 AuthUser
     */
    private AuthUser createKakaoUser(KakaoUserInfoResponse userInfo, String providerUserId, String phoneNumber, String name, LocalDate birthDate) {
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
                .phoneNumber(phoneNumber)
                .createdAt(now)
                .updatedAt(now)
                .build());

        String nickname = resolveKakaoNickname(userInfo, providerUserId);
        try {
            CreateUserResponse beResponse = beInternalClient.createUser(new CreateUserRequest(
                    saved.getId(),
                    generateUserNo(),
                    email,
                    name,
                    nickname,
                    phoneNumber,
                    AuthUser.Role.USER,
                    null,
                    birthDate
            ));
            
            if (beResponse != null && beResponse.organizerId() != null) {
                saved.updateOrganizerId(beResponse.organizerId());
            }
        } catch (Exception e) {
            log.error("Kakao 가입 시 BE 내부 사용자 생성 실패: userId={}", saved.getId(), e);
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
    private TokenResult issueTokens(AuthUser authUser) {
        String accessToken = jwtProvider.issueAccessToken(authUser.getId(), authUser.getRole());
        String refreshToken = jwtProvider.issueRefreshToken(authUser.getId());
        redisTokenStore.saveRefreshToken(
                authUser.getId(),
                refreshToken,
                jwtProvider.getRefreshTokenExpirySeconds()
        );
        return new TokenResult(accessToken, refreshToken, authUser.getId(), authUser.getOrganizerId());
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
