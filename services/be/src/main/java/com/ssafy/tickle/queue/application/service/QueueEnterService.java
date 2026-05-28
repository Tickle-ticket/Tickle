package com.ssafy.tickle.queue.application.service;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.queue.domain.QueueScope;
import com.ssafy.tickle.queue.infrastructure.cache.model.EventOpenInfo;
import com.ssafy.tickle.queue.infrastructure.messaging.model.QueueEnterMessage;
import com.ssafy.tickle.queue.infrastructure.cache.store.QueueEnterRequestStore;
import com.ssafy.tickle.queue.infrastructure.cache.store.EventOpenInfoStore;
import com.ssafy.tickle.queue.infrastructure.messaging.producer.QueueEnterProducer;
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

    private final EventOpenInfoStore eventOpenInfoStore;
    private final QueueEnterRequestStore queueEnterRequestStore;
    private final QueueEnterProducer queueEnterProducer;

    /**
     * 사용자의 대기열 진입 등록 요청을 접수합니다.
     *
     * @param eventId 예매 대상 공연 식별자
     * @param userId  사용자 식별자 (JWT에서 추출)
     * @return 접수된 요청 식별자
     */
    public QueueEnterResponse enter(Long eventId, Long userId) {
        return enter(QueueScope.BOOKING, eventId, userId);
    }

    public QueueEnterResponse enter(QueueScope scope, Long eventId, Long userId) {
        // queue enter는 DB를 직접 보지 않고 미리 적재된 공연 오픈 정보를 기준으로만 검증한다.
        EventOpenInfo eventOpenInfo = eventOpenInfoStore.findByEventId(eventId)
                .orElseThrow(() -> new BaseException(
                        GlobalErrorCode.RESOURCE_NOT_FOUND, "없는 공연이거나, 예매 예정인 공연이 아닙니다."
                ));

        validateQueueEntry(eventOpenInfo, Instant.now());

        String requestId = UUID.randomUUID().toString();
        boolean saved = queueEnterRequestStore.saveIfAbsent(scope, userId, eventId, requestId);
        if (!saved) {
            // 이미 진입한 사용자이거나 setIfAbsent 경합에서 졌다면, 먼저 저장된 requestId를 그대로 재사용한다.
            String duplicatedRequestId = queueEnterRequestStore.findRequestId(scope, userId, eventId)
                    .orElse(requestId);
            return QueueEnterResponse.pending(duplicatedRequestId);
        }

        try {
            // requestId는 Redis에 고정해두고, 실제 대기열 등록은 Kafka 비동기 소비 단계로 넘긴다.
            queueEnterProducer.publish(new QueueEnterMessage(
                    requestId,
                    userId,
                    scope,
                    eventId,
                    Instant.now()
            ));
        } catch (RuntimeException exception) {
            // Kafka 적재에 실패하면 중복 진입 방지 키도 함께 제거해 재시도를 허용한다.
            queueEnterRequestStore.delete(scope, userId, eventId, requestId);
            throw new BaseException(GlobalErrorCode.INTERNAL_SERVER_ERROR, "대기열 진입 요청 적재에 실패했습니다.");
        }

        return QueueEnterResponse.pending(requestId);
    }

    /**
     * 공연의 예매 가능 상태를 검증합니다.
     *
     * @param eventOpenInfo 대상 공연
     * @param now 현재 시각
     */
    private void validateQueueEntry(EventOpenInfo eventOpenInfo, Instant now) {
        if (now.isBefore(eventOpenInfo.salesStartAt())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "아직 예매 오픈 전인 공연입니다.");
        }

        if (!now.isBefore(eventOpenInfo.salesEndAt())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "예매가 종료된 공연입니다.");
        }
    }
}
