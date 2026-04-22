package com.ssafy.tickle.queue.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.queue.domain.messaging.QueueEnterCommand;
import com.ssafy.tickle.queue.domain.cache.SessionOpenInfo;
import com.ssafy.tickle.queue.infrastructure.cache.QueueEnterRequestCache;
import com.ssafy.tickle.queue.infrastructure.cache.SessionOpenInfoCache;
import com.ssafy.tickle.queue.infrastructure.messaging.QueueEnterProducer;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterRequest;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

/**
 * 대기열 진입 관련 비즈니스 로직을 처리합니다.
 */
@Service
@RequiredArgsConstructor
public class QueueService {

    private final SessionOpenInfoCache sessionOpenInfoCache;
    private final QueueEnterRequestCache queueEnterRequestCache;
    private final QueueEnterProducer queueEnterProducer;

    /**
     * 사용자의 대기열 진입 등록 요청을 접수합니다.
     *
     * @param request 대기열 진입 요청
     * @return 접수된 요청 식별자
     */
    public QueueEnterResponse enter(QueueEnterRequest request) {
        SessionOpenInfo sessionOpenInfo = sessionOpenInfoCache.findBySessionId(request.sessionId())
                .orElseThrow(() -> new BaseException(
                        GlobalErrorCode.RESOURCE_NOT_FOUND, "없는 회차이거나, 예매 예정인 회차가 아닙니다."
                ));

        validateQueueEntry(sessionOpenInfo, Instant.now());

        // 중복 요청 체크
        String existingRequestId = queueEnterRequestCache.findRequestId(request.userId(), request.sessionId())
                .orElse(null);
        if (existingRequestId != null) {
            return QueueEnterResponse.pending(existingRequestId);
        }

        // 추적용 요청 ID 생성
        String requestId = UUID.randomUUID().toString();
        boolean saved = queueEnterRequestCache.saveIfAbsent(request.userId(), request.sessionId(), requestId);
        if (!saved) {
            String duplicatedRequestId = queueEnterRequestCache.findRequestId(request.userId(), request.sessionId())
                    .orElse(requestId);
            return QueueEnterResponse.pending(duplicatedRequestId);
        }

        // Kafka 퍼블리싱
        try {
            queueEnterProducer.publish(new QueueEnterCommand(
                    requestId,
                    request.userId(),
                    request.sessionId(),
                    Instant.now()
            ));
        } catch (RuntimeException exception) {
            queueEnterRequestCache.delete(request.userId(), request.sessionId());
            throw new BaseException(GlobalErrorCode.INTERNAL_SERVER_ERROR, "대기열 진입 요청 적재에 실패했습니다.");
        }

        return QueueEnterResponse.pending(requestId);
    }

    /**
     * 회차의 예매 가능 상태를 검증합니다.
     *
     * @param sessionOpenInfo 대상 회차
     * @param now 현재 시각
     */
    private void validateQueueEntry(SessionOpenInfo sessionOpenInfo, Instant now) {
        if (now.isBefore(sessionOpenInfo.salesOpenAt())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "아직 예매 오픈 전인 회차입니다.");
        }

        if (!now.isBefore(sessionOpenInfo.salesCloseAt())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "예매가 종료된 회차입니다.");
        }
    }
}
