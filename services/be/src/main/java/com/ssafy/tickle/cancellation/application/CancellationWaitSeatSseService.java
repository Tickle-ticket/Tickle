package com.ssafy.tickle.cancellation.application;

import com.ssafy.tickle.cancellation.domain.CancellationWaitSeatChangedEvent;
import com.ssafy.tickle.cancellation.infrastructure.persistence.CancellationCandidateRepository;
import com.ssafy.tickle.cancellation.infrastructure.sse.CancellationWaitSeatSseEmitterRepository;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitSeatStatusMessage;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.queue.application.service.QueueStatusService;
import com.ssafy.tickle.queue.domain.QueueScope;
import com.ssafy.tickle.seat.domain.SeatStatusChangedEvent;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 예매 대기 좌석 SSE 구독과 브로드캐스트를 처리합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CancellationWaitSeatSseService {

    private final EventSessionRepository eventSessionRepository;
    private final SessionSeatRepository sessionSeatRepository;
    private final CancellationCandidateRepository cancellationCandidateRepository;
    private final CancellationWaitSeatSseEmitterRepository sseEmitterRepository;
    private final QueueStatusService queueStatusService;

    /**
     * 예매 대기 좌석별 대기 인원 변경 SSE를 구독합니다.
     *
     * @param eventId 공연 식별자
     * @param scheduleId 회차 식별자
     * @param userId 사용자 식별자
     * @param admitToken 예매 대기 큐 입장 토큰
     * @return SSE Emitter
     */
    @Transactional(readOnly = true)
    public SseEmitter subscribe(Long eventId, Long scheduleId, Long userId, String admitToken) {
        validateSession(eventId, scheduleId);
        queueStatusService.validateAdmitToken(QueueScope.CANCELLATION_WAIT, eventId, userId, admitToken);

        SseEmitter emitter = new SseEmitter(CancellationWaitSeatSseEmitterRepository.timeoutMillis());
        sseEmitterRepository.add(scheduleId, emitter);

        try {
            emitter.send(SseEmitter.event().comment("connected"));
        } catch (IOException e) {
            sseEmitterRepository.remove(scheduleId, emitter);
        }

        return emitter;
    }

    /**
     * 예매 대기 신청 완료 후 변경 좌석의 최신 대기 인원을 구독자에게 Push합니다.
     *
     * @param event 예매 대기 좌석 변경 이벤트
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCancellationWaitSeatChanged(CancellationWaitSeatChangedEvent event) {
        Long scheduleId = event.getScheduleId();
        List<SseEmitter> emitters = sseEmitterRepository.findByScheduleId(scheduleId);

        if (emitters.isEmpty()) {
            return;
        }

        Map<Long, Long> waitingCounts = findWaitingCounts(event.getSessionSeatIds());
        Map<Long, SessionSeat.SaleStatus> saleStatuses = findSaleStatuses(event.getSessionSeatIds());
        for (Long sessionSeatId : event.getSessionSeatIds()) {
            long waitingCount = waitingCounts.getOrDefault(sessionSeatId, 0L);
            send(scheduleId, emitters, sessionSeatId, saleStatuses.get(sessionSeatId), waitingCount);
        }
    }

    /**
     * 좌석 상태 변경 이벤트를 예매 대기 페이지 구독자에게도 Push합니다.
     *
     * @param event 좌석 상태 변경 이벤트
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSeatStatusChanged(SeatStatusChangedEvent event) {
        Long scheduleId = event.getScheduleId();
        List<SseEmitter> emitters = sseEmitterRepository.findByScheduleId(scheduleId);

        if (emitters.isEmpty()) {
            return;
        }

        Map<Long, Long> waitingCounts = findWaitingCounts(event.getSessionSeatIds());
        for (Long sessionSeatId : event.getSessionSeatIds()) {
            long waitingCount = waitingCounts.getOrDefault(sessionSeatId, 0L);
            send(scheduleId, emitters, sessionSeatId, event.getNewStatus(), waitingCount);
        }
    }

    /**
     * 요청한 회차가 공연에 속하는지 검증합니다.
     *
     * @param eventId 공연 식별자
     * @param scheduleId 회차 식별자
     */
    private void validateSession(Long eventId, Long scheduleId) {
        eventSessionRepository.findByIdAndEventId(scheduleId, eventId)
                .orElseThrow(() -> new BaseException(
                        GlobalErrorCode.RESOURCE_NOT_FOUND,
                        "공연(%d)에 속하는 회차(%d)를 찾을 수 없습니다.".formatted(eventId, scheduleId)
                ));
    }

    /**
     * 변경 좌석별 활성 예매 대기 인원 수를 조회합니다.
     *
     * @param sessionSeatIds 변경된 회차 좌석 식별자 목록
     * @return 회차 좌석 식별자별 대기 인원 수
     */
    private Map<Long, Long> findWaitingCounts(List<Long> sessionSeatIds) {
        if (sessionSeatIds.isEmpty()) {
            return Map.of();
        }

        return cancellationCandidateRepository.countActiveBySessionSeatIds(sessionSeatIds)
                .stream()
                .collect(Collectors.toMap(
                        CancellationCandidateRepository.WaitingCountProjection::getSessionSeatId,
                        CancellationCandidateRepository.WaitingCountProjection::getWaitingCount,
                        (left, right) -> left
                ));
    }

    /**
     * 변경 좌석별 판매 상태를 조회합니다.
     *
     * @param sessionSeatIds 변경된 회차 좌석 식별자 목록
     * @return 회차 좌석 식별자별 판매 상태
     */
    private Map<Long, SessionSeat.SaleStatus> findSaleStatuses(List<Long> sessionSeatIds) {
        if (sessionSeatIds.isEmpty()) {
            return Map.of();
        }

        return sessionSeatRepository.findAllByIdIn(sessionSeatIds)
                .stream()
                .collect(Collectors.toMap(SessionSeat::getId, SessionSeat::getSaleStatus));
    }

    /**
     * 구독자에게 예매 대기 좌석 상태 메시지를 전송합니다.
     *
     * @param scheduleId 회차 식별자
     * @param emitters SSE Emitter 목록
     * @param sessionSeatId 회차 좌석 식별자
     * @param saleStatus 현재 판매 상태
     * @param waitingCount 대기 인원 수
     */
    private void send(
            Long scheduleId,
            List<SseEmitter> emitters,
            Long sessionSeatId,
            SessionSeat.SaleStatus saleStatus,
            long waitingCount
    ) {
        CancellationWaitSeatStatusMessage message = new CancellationWaitSeatStatusMessage(
                sessionSeatId,
                saleStatus,
                waitingCount
        );

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().data(message, MediaType.APPLICATION_JSON));
                log.debug(
                        "[CancellationWaitSSE] Push -> scheduleId={} seatId={} status={} waitingCount={}",
                        scheduleId,
                        sessionSeatId,
                        saleStatus,
                        waitingCount
                );
            } catch (IOException e) {
                sseEmitterRepository.remove(scheduleId, emitter);
            }
        }
    }
}
