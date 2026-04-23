package com.ssafy.tickle.queue.application.service;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.queue.infrastructure.cache.model.SessionOpenInfo;
import com.ssafy.tickle.queue.infrastructure.messaging.model.QueueEnterMessage;
import com.ssafy.tickle.queue.infrastructure.cache.store.QueueEnterRequestStore;
import com.ssafy.tickle.queue.infrastructure.cache.store.SessionOpenInfoStore;
import com.ssafy.tickle.queue.infrastructure.messaging.producer.QueueEnterProducer;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterRequest;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

/**
 * 대기열 진입 요청 접수와 Kafka 적재를 담당합니다.
 */
@Service
@RequiredArgsConstructor
public class QueueEnterService {

    private final SessionOpenInfoStore sessionOpenInfoStore;
    private final QueueEnterRequestStore queueEnterRequestStore;
    private final QueueEnterProducer queueEnterProducer;

    /**
     * 사용자의 대기열 진입 등록 요청을 접수합니다.
     *
     * @param sessionId 예매 대상 회차 식별자
     * @param request 대기열 진입 요청
     * @return 접수된 요청 식별자
     */
    public QueueEnterResponse enter(Long sessionId, QueueEnterRequest request) {
        // queue enter는 DB를 직접 보지 않고 미리 적재된 회차 오픈 정보를 기준으로만 검증한다.
        SessionOpenInfo sessionOpenInfo = sessionOpenInfoStore.findBySessionId(sessionId)
                .orElseThrow(() -> new BaseException(
                        GlobalErrorCode.RESOURCE_NOT_FOUND, "없는 회차이거나, 예매 예정인 회차가 아닙니다."
                ));

        validateQueueEntry(sessionOpenInfo, Instant.now());

        String existingRequestId = queueEnterRequestStore.findRequestId(request.userId(), sessionId)
                .orElse(null);
        if (existingRequestId != null) {
            return QueueEnterResponse.pending(existingRequestId);
        }

        String requestId = UUID.randomUUID().toString();
        boolean saved = queueEnterRequestStore.saveIfAbsent(request.userId(), sessionId, requestId);
        if (!saved) {
            // setIfAbsent 경합에서 졌다면, 먼저 저장된 requestId를 그대로 재사용한다.
            String duplicatedRequestId = queueEnterRequestStore.findRequestId(request.userId(), sessionId)
                    .orElse(requestId);
            return QueueEnterResponse.pending(duplicatedRequestId);
        }

        try {
            // requestId는 Redis에 고정해두고, 실제 대기열 등록은 Kafka 비동기 소비 단계로 넘긴다.
            queueEnterProducer.publish(new QueueEnterMessage(
                    requestId,
                    request.userId(),
                    sessionId,
                    Instant.now()
            ));
        } catch (RuntimeException exception) {
            // Kafka 적재에 실패하면 중복 진입 방지 키도 함께 제거해 재시도를 허용한다.
            queueEnterRequestStore.delete(request.userId(), sessionId, requestId);
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
