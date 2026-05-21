package com.ssafy.tickle.cancellation.application;

import com.ssafy.tickle.seat.domain.SeatStatusChangedEvent;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

/**
 * 좌석 상태 변경 이벤트를 구독하여 취소표 재배분을 트리거하는 리스너입니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CancellationRedistributionEventListener {

    private final CancellationRedistributionService redistributionService;
    private final SessionSeatRepository sessionSeatRepository;

    /**
     * 좌석 상태가 REALLOCATING(재배분 대기)으로 변경되면 즉시 다음 대기자를 찾습니다.
     * 트랜잭션 커밋 후에 실행되어 데이터 일관성을 보장합니다.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleSeatStatusChanged(SeatStatusChangedEvent event) {
        if (event.getNewStatus() != SessionSeat.SaleStatus.REALLOCATING) {
            return;
        }

        log.info("취소표 발생 감지: redistribution 트리거 (scheduleId={}, seatIds={})", 
                event.getScheduleId(), event.getSessionSeatIds());

        List<SessionSeat> seats = sessionSeatRepository.findAllByIdIn(event.getSessionSeatIds());
        for (SessionSeat seat : seats) {
            try {
                redistributionService.processRedistribution(seat);
            } catch (Exception e) {
                log.error("취소표 재배분 처리 중 오류 발생 (seatId={})", seat.getId(), e);
            }
        }
    }
}
