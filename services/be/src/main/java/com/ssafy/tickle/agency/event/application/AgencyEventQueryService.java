package com.ssafy.tickle.agency.event.application;

import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyEventDetailResponse;
import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyEventListItemResponse;
import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyEventListResponse;
import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyEventSeatResponse;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventPricePolicyRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.organizer.infrastructure.persistence.OrganizerRepository;
import com.ssafy.tickle.seat.domain.EventSeat;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSeatRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 기획사 공연 조회를 담당합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AgencyEventQueryService {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final EventRepository eventRepository;
    private final EventPricePolicyRepository eventPricePolicyRepository;
    private final EventSessionRepository eventSessionRepository;
    private final OrganizerRepository organizerRepository;
    private final EventSeatRepository eventSeatRepository;
    private final SessionSeatRepository sessionSeatRepository;

    /**
     * 기획사 공연 목록을 조회합니다.
     *
     * @param organizerId 기획사 식별자
     * @param page 페이지 번호
     * @param size 페이지 크기
     * @return 공연 목록 응답
     */
    public AgencyEventListResponse getEvents(Long organizerId, int page, int size) {
        validateOrganizerExists(organizerId);

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))
        );

        Page<Event> eventPage = eventRepository.findByOrganizerId(organizerId, pageable);
        Map<Long, Long> confirmedSeatCounts = getConfirmedSeatCountMap(eventPage.getContent());

        List<AgencyEventListItemResponse> items = eventPage.getContent().stream()
                .map(event -> AgencyEventListItemResponse.from(
                        event,
                        calculateReservationRate(event, confirmedSeatCounts.getOrDefault(event.getId(), 0L))
                ))
                .toList();

        return AgencyEventListResponse.from(eventPage, items);
    }

    /**
     * 기획사 공연 상세를 조회합니다.
     *
     * @param eventId 공연 식별자
     * @return 공연 상세 응답
     */
    public AgencyEventDetailResponse getEventDetail(Long eventId) {
        Event event = getEventOrThrow(eventId);
        List<EventPricePolicy> pricePolicies = eventPricePolicyRepository.findByEventIdOrderByDisplayOrderAsc(eventId);
        List<EventSession> sessions = eventSessionRepository.findByEventIdOrderByStartAtAsc(eventId);
        return AgencyEventDetailResponse.from(event, pricePolicies, sessions);
    }

    /**
     * 공연의 가격 등급별 좌석 정보를 조회합니다.
     *
     * @param eventId 공연 식별자
     * @return 공연 좌석 응답
     */
    public AgencyEventSeatResponse getEventSeats(Long eventId) {
        Event event = getEventOrThrow(eventId);
        List<EventSeat> seats = eventSeatRepository.findByEventSection_Event_IdOrderByEventSection_DisplayOrderAscRowLabelAscSeatNumberAsc(eventId);
        return AgencyEventSeatResponse.from(event, seats);
    }

    /**
     * 기획사 존재 여부를 검증합니다.
     *
     * @param organizerId 기획사 식별자
     */
    private void validateOrganizerExists(Long organizerId) {
        if (!organizerRepository.existsById(organizerId)) {
            throw new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "기획사를 찾을 수 없습니다.");
        }
    }

    /**
     * 공연을 조회합니다.
     *
     * @param eventId 공연 식별자
     * @return 공연 엔티티
     */
    private Event getEventOrThrow(Long eventId) {
        return eventRepository.findWithDetailsById(eventId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "공연을 찾을 수 없습니다."));
    }

    /**
     * 공연 목록의 예매 확정 좌석 수를 공연별로 집계합니다.
     *
     * @param events 공연 목록
     * @return 공연별 예매 확정 좌석 수 맵
     */
    private Map<Long, Long> getConfirmedSeatCountMap(List<Event> events) {
        if (events.isEmpty()) {
            return Collections.emptyMap();
        }

        return sessionSeatRepository.countConfirmedSeatsByEventIds(
                        events.stream().map(Event::getId).toList(),
                        SessionSeat.SaleStatus.CONFIRMED
                ).stream()
                .collect(Collectors.toMap(
                        SessionSeatRepository.EventConfirmedSeatCountProjection::getEventId,
                        SessionSeatRepository.EventConfirmedSeatCountProjection::getConfirmedSeatCount
                ));
    }

    /**
     * 공연 예매율을 계산합니다.
     *
     * @param event 공연 엔티티
     * @param confirmedSeatCount 예매 확정 좌석 수
     * @return 예매율 퍼센트
     */
    private BigDecimal calculateReservationRate(Event event, long confirmedSeatCount) {
        Integer capacity = event.getVenue().getCapacity();
        if (capacity == null || capacity <= 0) {
            return BigDecimal.ZERO;
        }

        return BigDecimal.valueOf(confirmedSeatCount)
                .multiply(HUNDRED)
                .divide(BigDecimal.valueOf(capacity), 2, RoundingMode.HALF_UP);
    }
}
