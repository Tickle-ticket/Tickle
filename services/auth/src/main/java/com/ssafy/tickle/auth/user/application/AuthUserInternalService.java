package com.ssafy.tickle.auth.user.application;

import com.ssafy.tickle.auth.common.exception.BaseException;
import com.ssafy.tickle.auth.user.domain.AuthErrorCode;
import com.ssafy.tickle.auth.user.domain.AuthUser;
import com.ssafy.tickle.auth.user.infrastructure.persistence.AuthUserRepository;
import com.ssafy.tickle.auth.common.util.RedisTokenStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 내부 서버 간 통신 시 필요한 사용자 관리 비즈니스 로직을 처리하는 서비스입니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthUserInternalService {

    private final AuthUserRepository authUserRepository;
    private final RedisTokenStore redisTokenStore;

    /**
     * 사용자를 인증 서버 데이터베이스에서 영구 삭제하고 관련 토큰을 정리합니다.
     *
     * @param userId 삭제할 사용자 식별자
     * @throws BaseException 사용자가 없을 경우
     */
    @Transactional
    public void deleteUser(Long userId) {
        AuthUser authUser = authUserRepository.findById(userId)
                .orElseThrow(() -> new BaseException(AuthErrorCode.USER_NOT_FOUND));

        // 1. Refresh Token 삭제
        redisTokenStore.deleteRefreshToken(userId);

        // 2. AuthUser 하드 삭제
        authUserRepository.delete(authUser);

        log.info("인증 서버 사용자 삭제 완료: userId={}, email={}", userId, authUser.getEmail());
    }
}
