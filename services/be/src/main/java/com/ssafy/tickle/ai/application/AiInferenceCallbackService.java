package com.ssafy.tickle.ai.application;

import com.ssafy.tickle.ai.presentation.dto.AiInferenceCallbackRequest;
import com.ssafy.tickle.auth.domain.AuthErrorCode;
import com.ssafy.tickle.blacklist.application.BotDetectionCaptchaService;
import com.ssafy.tickle.blacklist.application.BlacklistService;
import com.ssafy.tickle.blacklist.infrastructure.cache.BotDetectionCaptchaRecordStore;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.common.util.JwtProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * AI 추론 결과 콜백을 처리하는 서비스입니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiInferenceCallbackService {

    private final BlacklistService blacklistService;
    private final BotDetectionCaptchaService botDetectionCaptchaService;
    private final BotDetectionCaptchaRecordStore botDetectionCaptchaRecordStore;
    private final JwtProvider jwtProvider;

    /**
     * AI 추론 결과를 수신합니다.
     *
     * <p>AI가 봇으로 판정한 사용자를 {@code BOT_DETECTED} 사유로
     * 블랙리스트에 등록합니다. 이미 등록된 사용자는 블랙리스트 서비스에서 멱등하게 처리합니다.</p>
     *
     * @param authorization 판정 대상 사용자 Authorization 헤더
     * @param request 콜백 요청
     */
    @Transactional
    public void receive(String authorization, AiInferenceCallbackRequest request) {
        // [테스트용 임시 비활성화] AI 서버 테스트 중 캡차 팝업 미표시 — 테스트 완료 후 원복 필요
        // be-feat-449의 isIgnoredType() 동작과 동일: 모든 타입(BOOKING/DETAIL/CAPTCHA/CAPTCHA_RETRY) 무시
        log.info("AI 추론 콜백 수신 (캡차 처리 비활성화 중): type={}, result={}", request.type(), request.result());
        return;

        /*
        if (authorization == null || authorization.isBlank()) {
            throw new BaseException(AuthErrorCode.MISSING_TOKEN);
        }
        Long targetUserId = jwtProvider.extractUserId(authorization);

        // result 가 block 이 아니면 조용히 무시
        if (request.result() != AiInferenceCallbackRequest.InferenceResult.BLOCK) {
            return;
        }

        log.info(
                "AI 추론 결과 수신: userId={}, recordId={}, result={}, type={}, scheduleId={}, eventId={}, eventDate={}, pMacro={}, createdAt={}",
                targetUserId,
                request.recordId(),
                request.result(),
                request.type(),
                request.scheduleId(),
                request.eventId(),
                request.eventDate(),
                request.pMacro(),
                request.createdAt()
        );

        // 블랙리스트 등록 (pMacro를 botScore로 저장)
        Double botScore = request.pMacro() != null ? request.pMacro().doubleValue() : null;
        blacklistService.addFromAiResult(targetUserId, botScore, request.description());

        // CAPTCHA verify에서 동일 사용자의 recordId인지 검증할 수 있도록 pending key를 남깁니다.
        boolean saved = botDetectionCaptchaRecordStore.save(targetUserId, request.recordId());
        if (!saved) {
            throw new BaseException(GlobalErrorCode.INTERNAL_SERVER_ERROR, "CAPTCHA 검증 recordId 저장에 실패했습니다.");
        }

        botDetectionCaptchaService.sendRetryCaptcha(targetUserId, request.recordId());
        */
    }
}
