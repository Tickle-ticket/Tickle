package com.ssafy.tickle.user.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import com.ssafy.tickle.user.presentation.dto.MyInfoResponse;
import com.ssafy.tickle.user.presentation.dto.UpdateMyInfoRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 사용자 조회 서비스 통합 테스트입니다.
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("UserService 통합 테스트")
class UserServiceTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @AfterEach
    void tearDown() {
        userRepository.deleteAllInBatch();
    }

    @Nested
    @DisplayName("내 정보 조회")
    class GetMyInfoTest {

        @Test
        @DisplayName("사용자 식별자로 조회하면 내 정보를 반환한다")
        void getMyInfo_success() {
            User savedUser = userRepository.save(createUser());

            MyInfoResponse response = userService.getMyInfo(savedUser.getId());

            assertThat(response.userId()).isEqualTo(savedUser.getId());
            assertThat(response.userNo()).isEqualTo("USER-0001");
            assertThat(response.email()).isEqualTo("user1@test.com");
            assertThat(response.phoneNumber()).isEqualTo("010-1234-5678");
            assertThat(response.name()).isEqualTo("홍길동");
            assertThat(response.nickname()).isEqualTo("길동이");
            assertThat(response.profileImageUrl()).isEqualTo("https://cdn.tickle.local/profiles/user1.png");
            assertThat(response.birthDate()).isEqualTo(LocalDate.of(1998, 4, 12));
        }

        @Test
        @DisplayName("userId 쿼리 파라미터가 전달되지 않으면 INVALID_REQUEST 예외가 발생한다")
        void getMyInfo_withoutUserId_throwsInvalidRequest() {
            assertThatThrownBy(() -> userService.getMyInfo(null))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.INVALID_REQUEST);
        }

        @Test
        @DisplayName("존재하지 않는 사용자 식별자로 조회하면 RESOURCE_NOT_FOUND 예외가 발생한다")
        void getMyInfo_notFound() {
            assertThatThrownBy(() -> userService.getMyInfo(Long.MAX_VALUE))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.RESOURCE_NOT_FOUND);
        }

    }

    @Nested
    @DisplayName("내 정보 수정")
    class UpdateMyInfoTest {

        @Test
        @DisplayName("일부 필드를 수정하면 닉네임, 전화번호, 프로필 이미지만 반영된다")
        void updateMyInfo_success() {
            User savedUser = userRepository.save(createUser());

            MyInfoResponse response = userService.updateMyInfo(
                    savedUser.getId(),
                    new UpdateMyInfoRequest(
                            "010-9999-9999",
                            "김싸피",
                            "https://cdn.tickle.local/profiles/updated-user1.png"
                    )
            );

            User updatedUser = userRepository.findById(savedUser.getId()).orElseThrow();

            assertThat(response.name()).isEqualTo("홍길동");
            assertThat(response.nickname()).isEqualTo("김싸피");
            assertThat(response.phoneNumber()).isEqualTo("010-9999-9999");
            assertThat(response.profileImageUrl()).isEqualTo("https://cdn.tickle.local/profiles/updated-user1.png");
            assertThat(updatedUser.getName()).isEqualTo("홍길동");
            assertThat(updatedUser.getNickname()).isEqualTo("김싸피");
            assertThat(updatedUser.getPhoneNumber()).isEqualTo("010-9999-9999");
            assertThat(updatedUser.getProfileImageUrl()).isEqualTo("https://cdn.tickle.local/profiles/updated-user1.png");
        }

        @Test
        @DisplayName("수정할 필드가 없으면 INVALID_REQUEST 예외가 발생한다")
        void updateMyInfo_withoutChanges_throwsInvalidRequest() {
            User savedUser = userRepository.save(createUser());

            assertThatThrownBy(() -> userService.updateMyInfo(
                    savedUser.getId(),
                    new UpdateMyInfoRequest(null, null, null)
            ))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.INVALID_REQUEST);
        }


    }

    @Nested
    @DisplayName("회원 탈퇴")
    class WithdrawMyInfoTest {

        @Test
        @DisplayName("사용자 식별자로 탈퇴하면 회원 정보가 실제 삭제된다")
        void withdrawMyInfo_success() {
            User savedUser = userRepository.save(createUser());

            userService.withdrawMyInfo(savedUser.getId());

            assertThat(userRepository.findById(savedUser.getId())).isEmpty();
        }

        @Test
        @DisplayName("userId 쿼리 파라미터가 전달되지 않으면 INVALID_REQUEST 예외가 발생한다")
        void withdrawMyInfo_withoutUserId_throwsInvalidRequest() {
            assertThatThrownBy(() -> userService.withdrawMyInfo(null))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.INVALID_REQUEST);
        }

        @Test
        @DisplayName("이미 삭제된 사용자는 다시 탈퇴할 수 없다")
        void withdrawMyInfo_deletedUser_notFound() {
            User savedUser = userRepository.save(createUser());
            userRepository.delete(savedUser);

            assertThatThrownBy(() -> userService.withdrawMyInfo(savedUser.getId()))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.RESOURCE_NOT_FOUND);
        }
    }

    private User createUser() {
        return createUser("USER-0001", "user1@test.com", "홍길동");
    }

    private User createUser(String userNo, String email, String name) {
        return User.builder()
                .userNo(userNo)
                .email(email)
                .phoneNumber("010-1234-5678")
                .name(name)
                .nickname("길동이")
                .profileImageUrl("https://cdn.tickle.local/profiles/user1.png")
                .birthDate(LocalDate.of(1998, 4, 12))
                .status(User.Status.ACTIVE)
                .lastLoginAt(Instant.parse("2026-04-25T12:30:00Z"))
                .createdAt(Instant.parse("2026-04-20T00:00:00Z"))
                .updatedAt(Instant.parse("2026-04-20T00:00:00Z"))
                .build();
    }
}
