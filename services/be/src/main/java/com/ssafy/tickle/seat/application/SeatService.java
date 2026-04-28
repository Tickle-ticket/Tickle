package com.ssafy.tickle.seat.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.seat.domain.EventSection;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.seat.presentation.dto.SeatItemResponse;
import com.ssafy.tickle.seat.presentation.dto.SeatMapResponse;
import com.ssafy.tickle.seat.presentation.dto.SeatSectionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 좌석 관련 비즈니스 로직을 처리하는 서비스 클래스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SeatService {

    private final EventSessionRepository eventSessionRepository;
    private final SessionSeatRepository sessionSeatRepository;

    /**
     * 공연 회차의 전체 좌석 배치도(상태)를 구역별로 조회합니다.
     *
     * <p>FE 하드코딩 배치도(좌표)와 합산하여 렌더링하기 위한 상태 정보만 반환합니다.
     * 최초 1회 호출 후 이후 변경분은 WebSocket Push로 수신합니다.</p>
     *
     * @param eventId    공연 식별자
     * @param scheduleId 회차 식별자
     * @return 구역별 좌석 상태 배치도
     */
    public SeatMapResponse getSeatMap(Long eventId, Long scheduleId) {
        // 공연 소속 검증: eventId + sessionId를 한 쿼리로 확인 (N+1 방지)
        validateSession(eventId, scheduleId);

        // 회차의 전체 좌석을 fetch join으로 한 번에 조회
        List<SessionSeat> sessionSeats = sessionSeatRepository.findBySessionIdWithDetails(scheduleId);

        // 구역별로 그룹핑 (DB ORDER BY로 정렬된 순서 유지)
        Map<EventSection, List<SeatItemResponse>> seatsBySection = sessionSeats.stream()
                .collect(Collectors.groupingBy(
                        ss -> ss.getEventSeat().getEventSection(),
                        LinkedHashMap::new,
                        Collectors.mapping(SeatItemResponse::from, Collectors.toList())
                ));

        List<SeatSectionResponse> sections = seatsBySection.entrySet().stream()
                .map(entry -> SeatSectionResponse.of(entry.getKey(), entry.getValue()))
                .toList();

        return new SeatMapResponse(sections);
    }

    /**
     * 회차가 해당 공연에 속하는지 검증합니다.
     *
     * <p>공연 존재 여부와 회차 소속 여부를 단일 쿼리로 검증하여
     * 불필요한 DB 조회를 최소화합니다.</p>
     *
     * @param eventId    공연 식별자
     * @param scheduleId 회차 식별자
     * @throws BaseException 공연 또는 회차를 찾을 수 없는 경우
     */
    private void validateSession(Long eventId, Long scheduleId) {
        eventSessionRepository.findByIdAndEventId(scheduleId, eventId)
                .orElseThrow(() -> new BaseException(
                        GlobalErrorCode.RESOURCE_NOT_FOUND,
                        "공연(%d)에 속하는 회차(%d)를 찾을 수 없습니다.".formatted(eventId, scheduleId)
                ));
    }
}
