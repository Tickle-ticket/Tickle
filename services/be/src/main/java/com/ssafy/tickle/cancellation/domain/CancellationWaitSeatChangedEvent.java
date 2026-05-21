package com.ssafy.tickle.cancellation.domain;

import org.springframework.context.ApplicationEvent;

import java.util.List;

/**
 * 예매 대기 좌석별 대기 인원 변경 이벤트입니다.
 *
 * <p>예매 대기 신청 트랜잭션 안에서 발행되고, 커밋 완료 후 SSE 브로드캐스트가 처리합니다.</p>
 */
public class CancellationWaitSeatChangedEvent extends ApplicationEvent {

    private final Long scheduleId;
    private final List<Long> sessionSeatIds;

    /**
     * 예매 대기 좌석 변경 이벤트를 생성합니다.
     *
     * @param source 이벤트 발행 주체
     * @param scheduleId 회차 식별자
     * @param sessionSeatIds 변경된 회차 좌석 식별자 목록
     */
    public CancellationWaitSeatChangedEvent(Object source, Long scheduleId, List<Long> sessionSeatIds) {
        super(source);
        this.scheduleId = scheduleId;
        this.sessionSeatIds = List.copyOf(sessionSeatIds);
    }

    public Long getScheduleId() {
        return scheduleId;
    }

    public List<Long> getSessionSeatIds() {
        return sessionSeatIds;
    }
}
