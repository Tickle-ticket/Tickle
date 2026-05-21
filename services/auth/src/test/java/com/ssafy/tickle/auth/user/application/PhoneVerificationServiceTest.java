package com.ssafy.tickle.auth.user.application;

import com.ssafy.tickle.auth.common.exception.BaseException;
import com.ssafy.tickle.auth.user.domain.AuthErrorCode;
import com.ssafy.tickle.auth.user.infrastructure.persistence.AuthUserRepository;
import net.nurigo.sdk.message.service.DefaultMessageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * PhoneVerificationService 단위 테스트입니다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("PhoneVerificationService 단위 테스트")
class PhoneVerificationServiceTest {

    @Mock private DefaultMessageService messageService;
    @Mock private StringRedisTemplate stringRedisTemplate;
    @Mock private AuthUserRepository authUserRepository;
    @Mock private ValueOperations<String, String> valueOps;

    @InjectMocks private PhoneVerificationService phoneVerificationService;

    private static final String PHONE       = "01012345678";
    private static final String CODE        = "123456";
    private static final String CODE_KEY    = "phone:code:" + PHONE;
    private static final String VERIFIED_KEY = "phone:verified:" + PHONE;

    // ── sendCode ─────────────────────────────────────────────────
    @Nested
    @DisplayName("인증 코드 발송 (sendCode)")
    class SendCodeTest {

        @Test
        @DisplayName("정상 발송 시 Redis에 코드를 저장하고 SMS를 발송한다")
        void sendCode_success() {
            given(authUserRepository.existsByPhoneNumber(PHONE)).willReturn(false);
            given(stringRedisTemplate.opsForValue()).willReturn(valueOps);

            phoneVerificationService.sendCode(PHONE);

            verify(valueOps).set(eq(CODE_KEY), anyString(), eq(Duration.ofMinutes(5)));
            verify(messageService).sendOne(any());
        }

        @Test
        @DisplayName("이미 가입된 전화번호로 발송 시 DUPLICATE_PHONE 예외를 던진다")
        void sendCode_duplicatePhone_throwsException() {
            given(authUserRepository.existsByPhoneNumber(PHONE)).willReturn(true);

            assertThatThrownBy(() -> phoneVerificationService.sendCode(PHONE))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.DUPLICATE_PHONE));

            verify(messageService, never()).sendOne(any());
        }

        @Test
        @DisplayName("SMS 발송 실패 시 PHONE_SMS_SEND_FAILED 예외를 던진다")
        void sendCode_smsFails_throwsException() {
            given(authUserRepository.existsByPhoneNumber(PHONE)).willReturn(false);
            given(stringRedisTemplate.opsForValue()).willReturn(valueOps);
            given(messageService.sendOne(any())).willThrow(new RuntimeException("CoolSMS 오류"));

            assertThatThrownBy(() -> phoneVerificationService.sendCode(PHONE))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.PHONE_SMS_SEND_FAILED));
        }
    }

    // ── verifyCode ───────────────────────────────────────────────
    @Nested
    @DisplayName("인증 코드 검증 (verifyCode)")
    class VerifyCodeTest {

        @Test
        @DisplayName("올바른 코드 입력 시 인증 완료 상태를 Redis에 저장한다")
        void verifyCode_success() {
            given(stringRedisTemplate.opsForValue()).willReturn(valueOps);
            given(valueOps.get(CODE_KEY)).willReturn(CODE);

            phoneVerificationService.verifyCode(PHONE, CODE);

            verify(stringRedisTemplate).delete(CODE_KEY);
            verify(valueOps).set(eq(VERIFIED_KEY), eq("true"), eq(Duration.ofMinutes(10)));
        }

        @Test
        @DisplayName("Redis에 코드가 없으면(만료) PHONE_VERIFICATION_FAILED 예외를 던진다")
        void verifyCode_codeExpired_throwsException() {
            given(stringRedisTemplate.opsForValue()).willReturn(valueOps);
            given(valueOps.get(CODE_KEY)).willReturn(null);

            assertThatThrownBy(() -> phoneVerificationService.verifyCode(PHONE, CODE))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.PHONE_VERIFICATION_FAILED));

            verify(stringRedisTemplate, never()).delete(anyString());
        }

        @Test
        @DisplayName("코드가 일치하지 않으면 PHONE_VERIFICATION_FAILED 예외를 던진다")
        void verifyCode_codeMismatch_throwsException() {
            given(stringRedisTemplate.opsForValue()).willReturn(valueOps);
            given(valueOps.get(CODE_KEY)).willReturn("999999");

            assertThatThrownBy(() -> phoneVerificationService.verifyCode(PHONE, CODE))
                    .isInstanceOf(BaseException.class)
                    .satisfies(e -> assertThat(((BaseException) e).getErrorCode())
                            .isEqualTo(AuthErrorCode.PHONE_VERIFICATION_FAILED));
        }
    }

    // ── isVerified ───────────────────────────────────────────────
    @Nested
    @DisplayName("인증 완료 여부 확인 (isVerified)")
    class IsVerifiedTest {

        @Test
        @DisplayName("Redis에 인증 완료 상태가 있으면 true를 반환한다")
        void isVerified_true() {
            given(stringRedisTemplate.opsForValue()).willReturn(valueOps);
            given(valueOps.get(VERIFIED_KEY)).willReturn("true");

            assertThat(phoneVerificationService.isVerified(PHONE)).isTrue();
        }

        @Test
        @DisplayName("Redis에 인증 완료 상태가 없으면 false를 반환한다")
        void isVerified_false_whenNotExists() {
            given(stringRedisTemplate.opsForValue()).willReturn(valueOps);
            given(valueOps.get(VERIFIED_KEY)).willReturn(null);

            assertThat(phoneVerificationService.isVerified(PHONE)).isFalse();
        }
    }

    // ── clearVerified ────────────────────────────────────────────
    @Nested
    @DisplayName("인증 완료 상태 제거 (clearVerified)")
    class ClearVerifiedTest {

        @Test
        @DisplayName("회원가입 완료 후 인증 완료 상태를 Redis에서 삭제한다")
        void clearVerified_deletesKey() {
            phoneVerificationService.clearVerified(PHONE);

            verify(stringRedisTemplate).delete(VERIFIED_KEY);
        }
    }
}
