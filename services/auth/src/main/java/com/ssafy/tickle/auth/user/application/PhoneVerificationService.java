package com.ssafy.tickle.auth.user.application;

import com.ssafy.tickle.auth.common.exception.BaseException;
import com.ssafy.tickle.auth.user.domain.AuthErrorCode;
import com.ssafy.tickle.auth.user.infrastructure.persistence.AuthUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.nurigo.sdk.message.model.Message;
import net.nurigo.sdk.message.request.SingleMessageSendingRequest;
import net.nurigo.sdk.message.service.DefaultMessageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;

/**
 * 휴대폰 인증 관련 비즈니스 로직을 처리하는 서비스 클래스입니다.
 *
 * <p>CoolSMS를 통해 인증 코드를 발송하고, Redis로 코드 유효성과 인증 완료 상태를 관리한다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PhoneVerificationService {

    private static final String CODE_PREFIX = "phone:code:";
    private static final String VERIFIED_PREFIX = "phone:verified:";
    private static final Duration CODE_TTL = Duration.ofMinutes(5);
    private static final Duration VERIFIED_TTL = Duration.ofMinutes(10);
    private static final int CODE_LENGTH = 6;

    private final DefaultMessageService messageService;
    private final StringRedisTemplate stringRedisTemplate;
    private final AuthUserRepository authUserRepository;

    @Value("${coolsms.sender-number}")
    private String senderNumber;

    /**
     * 휴대폰 인증 코드를 발송합니다.
     *
     * <p>이미 가입된 번호인 경우 발송하지 않는다.
     * 6자리 코드를 생성해 Redis에 저장(TTL 5분)하고 CoolSMS로 발송한다.</p>
     *
     * @param phoneNumber 수신자 휴대폰 번호 (010xxxxxxxx)
     */
    public void sendCode(String phoneNumber) {
        if (authUserRepository.existsByPhoneNumber(phoneNumber)) {
            throw new BaseException(AuthErrorCode.DUPLICATE_PHONE);
        }

        String code = generateCode();
        stringRedisTemplate.opsForValue().set(CODE_PREFIX + phoneNumber, code, CODE_TTL);

        sendSms(phoneNumber, "[Tickle] 인증번호: " + code + " (5분 내 입력)");
        log.info("인증 코드 발송 완료: phoneNumber={}", phoneNumber);
    }

    /**
     * 인증 코드를 검증하고 인증 완료 상태를 Redis에 저장합니다.
     *
     * <p>코드가 일치하면 Redis의 코드를 삭제하고 인증 완료 상태를 10분간 유지한다.</p>
     *
     * @param phoneNumber 휴대폰 번호
     * @param code        사용자가 입력한 인증 코드
     */
    public void verifyCode(String phoneNumber, String code) {
        String storedCode = stringRedisTemplate.opsForValue().get(CODE_PREFIX + phoneNumber);

        if (storedCode == null || !storedCode.equals(code)) {
            throw new BaseException(AuthErrorCode.PHONE_VERIFICATION_FAILED);
        }

        // 코드 삭제 후 인증 완료 상태 저장
        stringRedisTemplate.delete(CODE_PREFIX + phoneNumber);
        stringRedisTemplate.opsForValue().set(VERIFIED_PREFIX + phoneNumber, "true", VERIFIED_TTL);
        log.info("휴대폰 인증 완료: phoneNumber={}", phoneNumber);
    }

    /**
     * 해당 번호가 인증 완료 상태인지 확인합니다.
     *
     * @param phoneNumber 확인할 휴대폰 번호
     * @return 인증 완료 여부
     */
    public boolean isVerified(String phoneNumber) {
        return Boolean.TRUE.toString().equals(
                stringRedisTemplate.opsForValue().get(VERIFIED_PREFIX + phoneNumber)
        );
    }

    /**
     * 회원가입 완료 후 인증 완료 상태를 Redis에서 삭제합니다.
     *
     * @param phoneNumber 휴대폰 번호
     */
    public void clearVerified(String phoneNumber) {
        stringRedisTemplate.delete(VERIFIED_PREFIX + phoneNumber);
    }

    /**
     * 6자리 랜덤 인증 코드를 생성합니다.
     *
     * @return 6자리 숫자 문자열
     */
    private String generateCode() {
        SecureRandom random = new SecureRandom();
        return String.format("%06d", random.nextInt(1_000_000));
    }

    /**
     * CoolSMS를 통해 SMS를 발송합니다.
     *
     * @param to   수신자 번호
     * @param text 메시지 내용
     */
    private void sendSms(String to, String text) {
        try {
            Message message = new Message();
            message.setFrom(senderNumber);
            message.setTo(to);
            message.setText(text);

            messageService.sendOne(new SingleMessageSendingRequest(message));
        } catch (Exception e) {
            log.error("SMS 발송 실패: to={}, error={}", to, e.getMessage());
            throw new BaseException(AuthErrorCode.PHONE_SMS_SEND_FAILED);
        }
    }
}
