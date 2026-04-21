package com.ssafy.tickle.queue.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.queue.domain.SessionOpenInfo;
import com.ssafy.tickle.queue.infrastructure.cache.SessionOpenInfoCache;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterRequest;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * 대기열 진입 관련 비즈니스 로직을 처리합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QueueService {

    private final SessionOpenInfoCache sessionOpenInfoCache;

    /**
     * 사용자의 대기열 진입 등록 요청을 접수합니다.
     *
     * @param request 대기열 진입 요청
     * @return 접수된 요청 식별자
     */
    public QueueEnterResponse enter(QueueEnterRequest request) {
        SessionOpenInfo sessionOpenInfo = sessionOpenInfoCache.findBySessionId(request.sessionId())
                .orElseThrow(() -> new BaseException(
                        GlobalErrorCode.RESOURCE_NOT_FOUND,
                        "대기열 진입용 회차 메타데이터를 찾을 수 없습니다."
                ));

        validateQueueEntry(sessionOpenInfo, Instant.now());

        String requestId = UUID.randomUUID().toString();

        // TODO: Kafka 진입 요청 적재 및 중복 진입 검증 연동
        return QueueEnterResponse.pending(requestId);
    }

    /**
     * 회차의 예매 가능 상태를 검증합니다.
     *
     * @param session 대상 회차
     * @param now 현재 시각
     */
    private void validateQueueEntry(SessionOpenInfo sessionOpenInfo, Instant now) {
        if (now.isBefore(sessionOpenInfo.salesOpenAt())) {
            throw new BaseException(GlobalErrorCode.QUEUE_NOT_OPEN);
        }

        if (!now.isBefore(sessionOpenInfo.salesCloseAt())) {
            throw new BaseException(GlobalErrorCode.QUEUE_CLOSED);
        }
    }
}
