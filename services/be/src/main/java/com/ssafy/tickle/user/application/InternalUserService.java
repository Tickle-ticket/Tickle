package com.ssafy.tickle.user.application;

import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import com.ssafy.tickle.user.presentation.dto.CreateUserRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 내부 API를 통한 사용자 생성 서비스입니다.
 *
 * <p>Auth 서버의 회원가입 요청에 의해 호출되며,
 * tickle_core.users 레코드를 생성합니다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InternalUserService {

    private final UserRepository userRepository;

    /**
     * Auth 서버의 내부 요청으로 사용자 프로필을 생성합니다.
     *
     * <p>userId는 tickle_auth.users.id와 동일한 값을 사용하여 두 DB의 사용자를 식별합니다.
     * status는 기본값 ACTIVE로 설정합니다.</p>
     *
     * @param request Auth 서버에서 전달받은 사용자 생성 정보
     */
    @Transactional
    public void createUser(CreateUserRequest request) {
        log.info("내부 사용자 생성 요청: userId={}, userNo={}", request.userId(), request.userNo());

        User user = User.builder()
                .id(request.userId())
                .userNo(request.userNo())
                .email(request.email())
                .name(request.name())
                .nickname(request.nickname())
                .status(User.Status.ACTIVE)
                .build();

        userRepository.save(user);

        log.info("내부 사용자 생성 완료: userId={}", request.userId());
    }
}
