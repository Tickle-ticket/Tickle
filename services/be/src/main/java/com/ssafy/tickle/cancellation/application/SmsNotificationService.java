package com.ssafy.tickle.cancellation.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.nurigo.sdk.message.model.Message;
import net.nurigo.sdk.message.request.SingleMessageSendingRequest;
import net.nurigo.sdk.message.service.DefaultMessageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * 취소표 등 시스템 이벤트 발생 시 CoolSMS로 문자를 발송하는 서비스입니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmsNotificationService {

    private final DefaultMessageService messageService;

    @Value("${coolsms.sender-number}")
    private String senderNumber;

    /**
     * 특정 사용자에게 취소표 발생 알림을 전송합니다.
     *
     * @param to 휴대폰 번호
     */
    public void sendCancellationNotifyMessage(String to) {
        String text = "[Tickle] 취소표 발생 안내\n\n" +
                "회원님이 대기하신 좌석에 취소표가 발생했습니다.\n" +
                "1시간 내에 예매를 완료하지 않으면 다음 대기자에게 기회가 넘어갑니다.\n\n" +
                "결제 링크: https://tickle-ticket.co.kr/?view=mypage&tab=WAITLIST";

        Message message = new Message();
        message.setFrom(senderNumber);
        message.setTo(to.replace("-", ""));
        message.setText(text);

        try {
            messageService.sendOne(new SingleMessageSendingRequest(message));
            log.info("취소표 알림 문자 발송 성공: {}", to);
        } catch (Exception e) {
            log.error("취소표 알림 문자 발송 실패: {}", to, e);
            // 문자 발송 실패는 시스템 핵심 비즈니스를 막지 않도록 로깅만 합니다.
        }
    }
}
