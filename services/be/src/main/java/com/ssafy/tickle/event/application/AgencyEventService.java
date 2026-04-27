package com.ssafy.tickle.event.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.Category;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.domain.Organizer;
import com.ssafy.tickle.event.infrastructure.persistence.CategoryRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventPricePolicyRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.event.infrastructure.persistence.OrganizerRepository;
import com.ssafy.tickle.event.presentation.dto.agency.AgencyCreateEventPricePolicyRequest;
import com.ssafy.tickle.event.presentation.dto.agency.AgencyCreateEventRequest;
import com.ssafy.tickle.event.presentation.dto.agency.AgencyCreateEventResponse;
import com.ssafy.tickle.event.presentation.dto.agency.AgencyCreateEventSeatRequest;
import com.ssafy.tickle.event.presentation.dto.agency.AgencyCreateEventSessionRequest;
import com.ssafy.tickle.event.presentation.dto.agency.AgencyVenueTemplateResponse;
import com.ssafy.tickle.seat.domain.EventSeat;
import com.ssafy.tickle.seat.domain.EventSection;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSeatRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSectionRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.venue.domain.Venue;
import com.ssafy.tickle.venue.domain.VenueSeat;
import com.ssafy.tickle.venue.domain.VenueSection;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueRepository;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueSeatRepository;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueSectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 기획사 공연 등록 비즈니스 로직을 처리합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AgencyEventService {

    private final EventRepository eventRepository;
    private final EventSessionRepository eventSessionRepository;
    private final EventPricePolicyRepository eventPricePolicyRepository;
    private final OrganizerRepository organizerRepository;
    private final CategoryRepository categoryRepository;
    private final VenueRepository venueRepository;
    private final VenueSectionRepository venueSectionRepository;
    private final VenueSeatRepository venueSeatRepository;
    private final EventSectionRepository eventSectionRepository;
    private final EventSeatRepository eventSeatRepository;
    private final SessionSeatRepository sessionSeatRepository;

    public AgencyVenueTemplateResponse getVenueTemplate(Long venueId) {
        Venue venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "공연장을 찾을 수 없습니다."));

        List<VenueSection> sections = venueSectionRepository.findByVenue_IdOrderByDisplayOrderAsc(venueId);

        List<VenueSeat> seats = venueSeatRepository.findByVenueIdOrderBySection_DisplayOrderAscRowLabelAscSeatNumberAsc(venueId);

        return AgencyVenueTemplateResponse.from(venue, sections, seats);
    }

    @Transactional
    public AgencyCreateEventResponse createEvent(AgencyCreateEventRequest request) {
        validateEventTimeline(request);

        Organizer organizer = organizerRepository.findById(request.organizerId())
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "기획사를 찾을 수 없습니다."));

        Venue venue = venueRepository.findById(request.venueId())
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "공연장을 찾을 수 없습니다."));

        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "카테고리를 찾을 수 없습니다."));

        Event event = eventRepository.save(Event.builder()
                .organizer(organizer)
                .venue(venue)
                .title(request.title())
                .category(category)
                .salesStartAt(request.salesStartAt())
                .salesEndAt(request.salesEndAt())
                .eventStartAt(request.eventStartAt())
                .eventEndAt(request.eventEndAt())
                .metadata(new Event.EventMetadata(request.tags()))
                .notice(request.notice())
                .status(Event.Status.PENDING)
                .build());

        // 가격 정책과 회차를 먼저 만든 뒤, 공연장 좌석을 이벤트 좌석/회차 좌석으로 복제합니다.
        Map<String, EventPricePolicy> pricePolicyByKey = createPricePolicies(event, request.pricePolicies());

        List<EventSession> sessions = createSessions(event, request.sessions());

        List<EventSeat> eventSeats = createEventSeats(event, venue.getId(), request.seats(), pricePolicyByKey);

        createSessionSeats(sessions, eventSeats);

        return AgencyCreateEventResponse.from(
                event,
                sessions,
                eventSeats.size(),
                sessions.size() * eventSeats.size()
        );
    }

    private void validateEventTimeline(AgencyCreateEventRequest request) {
        if (!request.salesStartAt().isBefore(request.salesEndAt())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "공연 판매 시작 시각은 종료 시각보다 빨라야 합니다.");
        }
        if (!request.eventStartAt().isBefore(request.eventEndAt())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "공연 시작 시각은 종료 시각보다 빨라야 합니다.");
        }
    }

    private Map<String, EventPricePolicy> createPricePolicies(
            Event event,
            List<AgencyCreateEventPricePolicyRequest> requests
    ) {
        Set<String> keys = new LinkedHashSet<>();
        List<EventPricePolicy> policies = new ArrayList<>();

        for (AgencyCreateEventPricePolicyRequest request : requests) {
            String key = policyKey(request.priceGrade(), request.audienceType());
            if (!keys.add(key)) {
                throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "가격 정책 조합이 중복되었습니다: " + key);
            }

            policies.add(EventPricePolicy.builder()
                    .event(event)
                    .priceGrade(request.priceGrade())
                    .audienceType(request.audienceType())
                    .salePriceAmount(request.salePriceAmount())
                    .currencyCode(request.currencyCode())
                    .displayOrder(request.displayOrder())
                    .build());
        }

        List<EventPricePolicy> savedPolicies = eventPricePolicyRepository.saveAll(policies);
        Map<String, EventPricePolicy> pricePolicyByKey = new LinkedHashMap<>();
        for (EventPricePolicy savedPolicy : savedPolicies) {
            pricePolicyByKey.put(policyKey(savedPolicy.getPriceGrade(), savedPolicy.getAudienceType()), savedPolicy);
        }
        return pricePolicyByKey;
    }

    private List<EventSession> createSessions(Event event, List<AgencyCreateEventSessionRequest> requests) {
        Set<Integer> sessionNos = new LinkedHashSet<>();
        List<EventSession> sessions = new ArrayList<>();

        for (AgencyCreateEventSessionRequest request : requests) {
            validateSessionTimeline(request);
            if (!sessionNos.add(request.sessionNo())) {
                throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "회차 번호가 중복되었습니다: " + request.sessionNo());
            }
            // 회차별 예매 오픈/마감 시간은 공연 전체 기간과 별도로 받되, 시각 순서는 검증합니다.
            sessions.add(EventSession.builder()
                    .event(event)
                    .sessionNo(request.sessionNo())
                    .startAt(request.startAt())
                    .endAt(request.endAt())
                    .salesOpenAt(request.salesOpenAt())
                    .salesCloseAt(request.salesCloseAt())
                    .status(EventSession.Status.PENDING)
                    .build());
        }

        return eventSessionRepository.saveAll(sessions);
    }

    private List<EventSeat> createEventSeats(
            Event event,
            Long venueId,
            List<AgencyCreateEventSeatRequest> requests,
            Map<String, EventPricePolicy> pricePolicyByKey
    ) {
        Set<Long> venueSeatIds = new LinkedHashSet<>();
        for (AgencyCreateEventSeatRequest request : requests) {
            if (request.venueSeatId() == null) {
                throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "venueSeatId는 필수입니다.");
            }
            if (!venueSeatIds.add(request.venueSeatId())) {
                throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "좌석이 중복되었습니다: " + request.venueSeatId());
            }
        }

        List<VenueSeat> venueSeats = venueSeatRepository.findByIdIn(venueSeatIds);
        if (venueSeats.size() != venueSeatIds.size()) {
            throw new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "일부 공연장 좌석을 찾을 수 없습니다.");
        }

        Map<Long, VenueSeat> venueSeatById = new LinkedHashMap<>();
        for (VenueSeat venueSeat : venueSeats) {
            if (!venueId.equals(venueSeat.getVenueId())) {
                throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "다른 공연장의 좌석이 포함되어 있습니다.");
            }
            venueSeatById.put(venueSeat.getId(), venueSeat);
        }

        // 이벤트 구역은 실제 선택된 공연장 구역만 복제해서 생성합니다.
        Map<Long, EventSection> eventSectionByVenueSectionId = createEventSections(event, venueId, venueSeats);
        List<EventSeat> eventSeats = new ArrayList<>();

        for (AgencyCreateEventSeatRequest request : requests) {
            VenueSeat venueSeat = venueSeatById.get(request.venueSeatId());
            EventPricePolicy pricePolicy = pricePolicyByKey.get(policyKey(request.priceGrade(), request.audienceType()));
            if (pricePolicy == null) {
                throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "좌석에 연결할 가격 정책을 찾을 수 없습니다.");
            }

            eventSeats.add(EventSeat.builder()
                    .eventSection(eventSectionByVenueSectionId.get(venueSeat.getSection().getId()))
                    .eventPricePolicy(pricePolicy)
                    .venueId(venueId)
                    .rowLabel(venueSeat.getRowLabel())
                    .seatNumber(venueSeat.getSeatNumber())
                    .seatLabel(venueSeat.getSeatLabel())
                    .seatType(EventSeat.SeatType.valueOf(venueSeat.getSeatType().name()))
                    .build());
        }

        return eventSeatRepository.saveAll(eventSeats);
    }

    private Map<Long, EventSection> createEventSections(Event event, Long venueId, List<VenueSeat> venueSeats) {
        Map<Long, VenueSection> venueSectionById = new LinkedHashMap<>();
        for (VenueSeat venueSeat : venueSeats) {
            venueSectionById.putIfAbsent(venueSeat.getSection().getId(), venueSeat.getSection());
        }

        List<EventSection> eventSections = venueSectionById.values().stream()
                .map(section -> EventSection.builder()
                        .event(event)
                        .venueId(venueId)
                        .sectionName(section.getSectionName())
                        .displayOrder(section.getDisplayOrder())
                        .build())
                .toList();

        List<EventSection> savedSections = eventSectionRepository.saveAll(eventSections);
        Map<Long, EventSection> eventSectionByVenueSectionId = new LinkedHashMap<>();
        int index = 0;
        for (Long venueSectionId : venueSectionById.keySet()) {
            eventSectionByVenueSectionId.put(venueSectionId, savedSections.get(index++));
        }
        return eventSectionByVenueSectionId;
    }

    private void createSessionSeats(List<EventSession> sessions, List<EventSeat> eventSeats) {
        List<SessionSeat> sessionSeats = new ArrayList<>();

        for (EventSession session : sessions) {
            // 회차 좌석은 공연 좌석을 그대로 복제하고, 최초 상태만 AVAILABLE로 초기화합니다.
            for (EventSeat eventSeat : eventSeats) {
                sessionSeats.add(SessionSeat.builder()
                        .session(session)
                        .eventSeat(eventSeat)
                        .eventSectionId(eventSeat.getEventSection().getId())
                        .saleStatus(SessionSeat.SaleStatus.AVAILABLE)
                        .versionNo(1L)
                        .build());
            }
        }

        sessionSeatRepository.saveAll(sessionSeats);
    }

    private void validateSessionTimeline(AgencyCreateEventSessionRequest request) {
        if (!request.startAt().isBefore(request.endAt())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "회차 시작 시각은 종료 시각보다 빨라야 합니다.");
        }
        if (!request.salesOpenAt().isBefore(request.salesCloseAt())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "회차 예매 시작 시각은 종료 시각보다 빨라야 합니다.");
        }
    }

    private String policyKey(String priceGrade, String audienceType) {
        return priceGrade + "::" + audienceType;
    }
}
