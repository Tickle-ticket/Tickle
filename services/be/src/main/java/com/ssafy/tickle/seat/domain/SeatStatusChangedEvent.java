package com.ssafy.tickle.seat.domain;

import com.ssafy.tickle.seat.domain.SessionSeat.SaleStatus;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.List;

/**
 * 좌석 상태 변경 도메인 이벤트입니다.
 *
 * <p>트랜잭션 내에서 발행되고, 커밋 완료 후 {@code SeatBroadcastService}가
 * WebSocket Push를 실행합니다 (@TransactionalEventListener).</p>
 */
@Getter
public class SeatStatusChangedEvent extends ApplicationEvent {

    private final Long scheduleId;
    private final List<Long> sessionSeatIds;
    private final SaleStatus newStatus;

    public SeatStatusChangedEvent(Object source, Long scheduleId, List<Long> sessionSeatIds, SaleStatus newStatus) {
        super(source);
        this.scheduleId = scheduleId;
        this.sessionSeatIds = sessionSeatIds;
        this.newStatus = newStatus;
    }
}
