package com.ssafy.tickle.seat.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
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

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 좌석 관련 비즈니스 로직을 처리하는 서비스 클래스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SeatService {

    private final EventRepository eventRepository;
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
        // 공연 존재 여부 확인
        if (!eventRepository.existsById(eventId)) {
            throw new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "공연을 찾을 수 없습니다.");
        }

        // 회차 존재 여부 및 해당 공연 소속 여부 확인
        EventSession session = eventSessionRepository.findById(scheduleId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "회차를 찾을 수 없습니다."));

        if (!session.getEvent().getId().equals(eventId)) {
            throw new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "해당 공연의 회차를 찾을 수 없습니다.");
        }

        // 회차의 전체 좌석을 fetch join으로 한 번에 조회
        List<SessionSeat> sessionSeats = sessionSeatRepository.findBySessionIdWithDetails(scheduleId);

        // 구역별로 그룹핑 (displayOrder 유지)
        Map<EventSection, List<SeatItemResponse>> seatsBySection = new LinkedHashMap<>();
        for (SessionSeat sessionSeat : sessionSeats) {
            EventSection section = sessionSeat.getEventSeat().getEventSection();
            seatsBySection.computeIfAbsent(section, k -> new ArrayList<>())
                    .add(SeatItemResponse.from(sessionSeat));
        }

        // 구역별 응답 목록 생성
        List<SeatSectionResponse> sections = seatsBySection.entrySet().stream()
                .map(entry -> SeatSectionResponse.of(entry.getKey(), entry.getValue()))
                .toList();

        return SeatMapResponse.of(sections);
    }
}
