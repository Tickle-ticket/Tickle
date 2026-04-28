package com.ssafy.tickle.user.application;

import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import com.ssafy.tickle.user.presentation.dto.CreateUserRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.times;

/**
 * InternalUserService 단위 테스트입니다.
 *
 * <p>외부 의존성(DB, Spring Context) 없이 순수 비즈니스 로직만 검증합니다.</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("InternalUserService 단위 테스트")
class InternalUserServiceTest {

    @InjectMocks
    private InternalUserService internalUserService;

    @Mock
    private UserRepository userRepository;

    @Nested
    @DisplayName("내부 사용자 생성 (createUser)")
    class CreateUserTest {

        @Test
        @DisplayName("올바른 요청이 들어오면 User 엔티티를 저장한다")
        void createUser_success_savesUser() {
            // given
            CreateUserRequest request = new CreateUserRequest(
                    1L,
                    "TK-a1b2c3d4",
                    "user@example.com",
                    "홍길동",
                    "길동이"
            );

            User savedUser = User.builder()
                    .id(1L)
                    .userNo("TK-a1b2c3d4")
                    .email("user@example.com")
                    .name("홍길동")
                    .nickname("길동이")
                    .status(User.Status.ACTIVE)
                    .build();

            given(userRepository.save(any(User.class))).willReturn(savedUser);

            // when
            internalUserService.createUser(request);

            // then
            then(userRepository).should(times(1)).save(any(User.class));
        }

        @Test
        @DisplayName("저장 시 User 엔티티의 필드가 요청값과 일치한다")
        void createUser_success_entityFieldsMatchRequest() {
            // given
            CreateUserRequest request = new CreateUserRequest(
                    42L,
                    "TK-deadbeef",
                    "test@tickle.com",
                    "김테스트",
                    "테스터"
            );

            ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
            given(userRepository.save(userCaptor.capture())).willAnswer(invocation -> invocation.getArgument(0));

            // when
            internalUserService.createUser(request);

            // then
            User capturedUser = userCaptor.getValue();
            assertThat(capturedUser.getId()).isEqualTo(42L);
            assertThat(capturedUser.getUserNo()).isEqualTo("TK-deadbeef");
            assertThat(capturedUser.getEmail()).isEqualTo("test@tickle.com");
            assertThat(capturedUser.getName()).isEqualTo("김테스트");
            assertThat(capturedUser.getNickname()).isEqualTo("테스터");
            assertThat(capturedUser.getStatus()).isEqualTo(User.Status.ACTIVE);
        }

        @Test
        @DisplayName("저장 시 User의 createdAt과 updatedAt은 null이 아니다")
        void createUser_success_timestampsAreNotNull() {
            // given
            CreateUserRequest request = new CreateUserRequest(
                    10L,
                    "TK-ffffffff",
                    "ts@tickle.com",
                    "타임스탬프",
                    "TS유저"
            );

            ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
            given(userRepository.save(userCaptor.capture())).willAnswer(invocation -> invocation.getArgument(0));

            // when
            internalUserService.createUser(request);

            // then
            User capturedUser = userCaptor.getValue();
            assertThat(capturedUser.getCreatedAt()).isNotNull();
            assertThat(capturedUser.getUpdatedAt()).isNotNull();
        }

        @Test
        @DisplayName("UserRepository.save()에서 예외가 발생하면 예외가 전파된다")
        void createUser_repositoryThrows_propagatesException() {
            // given
            CreateUserRequest request = new CreateUserRequest(
                    99L,
                    "TK-errorcase",
                    "error@tickle.com",
                    "에러",
                    "에러유저"
            );

            given(userRepository.save(any(User.class)))
                    .willThrow(new RuntimeException("DB 연결 실패"));

            // when & then
            org.assertj.core.api.Assertions.assertThatThrownBy(
                    () -> internalUserService.createUser(request)
            )
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("DB 연결 실패");
        }
    }
}
