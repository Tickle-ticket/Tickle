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

    /**
     * 공연장 구역과 좌석 골격을 조회합니다.
     *
     * @param venueId 공연장 식별자
     * @return 공연 등록 화면에서 사용할 공연장 골격 응답 DTO
     */
    public AgencyVenueTemplateResponse getVenueTemplate(Long venueId) {
        Venue venue = getVenueOrThrow(venueId);

        List<VenueSection> sections = venueSectionRepository.findByVenue_IdOrderByDisplayOrderAsc(venueId);

        List<VenueSeat> seats = venueSeatRepository.findByVenueIdOrderBySection_DisplayOrderAscRowLabelAscSeatNumberAsc(venueId);

        return AgencyVenueTemplateResponse.from(venue, sections, seats);
    }

    /**
     * 공연, 가격 정책, 회차, 좌석 정보를 한 번에 등록합니다.
     *
     * <p>입력된 공연장 좌석을 기준으로 이벤트 좌석과 회차 좌석까지 함께 생성합니다.</p>
     *
     * @param request 기획사 공연 생성 요청 DTO
     * @return 생성된 공연 응답 DTO
     */
    @Transactional
    public AgencyCreateEventResponse createEvent(AgencyCreateEventRequest request) {
        validateEventTimeline(request);

        Organizer organizer = getOrganizerOrThrow(request.organizerId());
        Venue venue = getVenueOrThrow(request.venueId());
        Category category = getCategoryOrThrow(request.categoryId());

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
        Map<PricePolicyKey, EventPricePolicy> pricePolicyByKey = createPricePolicies(event, request.pricePolicies());

        List<EventSession> sessions = createSessions(event, request.sessions());

        List<EventSeat> eventSeats = createEventSeats(event, venue.getId(), request.seats(), pricePolicyByKey);

        createSessionSeats(sessions, eventSeats);

        return AgencyCreateEventResponse.from(event);
    }

    /**
     * 공연 판매 기간과 공연 진행 기간의 선후관계를 검증합니다.
     *
     * @param request 기획사 공연 생성 요청 DTO
     */
    private void validateEventTimeline(AgencyCreateEventRequest request) {
        if (!request.salesStartAt().isBefore(request.salesEndAt())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "공연 판매 시작 시각은 종료 시각보다 빨라야 합니다.");
        }
        if (!request.eventStartAt().isBefore(request.eventEndAt())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "공연 시작 시각은 종료 시각보다 빨라야 합니다.");
        }
    }

    /**
     * 공연 가격 정책을 생성하고 등급/관람대상 조합 기준으로 맵을 구성합니다.
     *
     * @param event 공연 엔티티
     * @param requests 가격 정책 요청 목록
     * @return 가격 정책 조합 키 기준 맵
     */
    private Map<PricePolicyKey, EventPricePolicy> createPricePolicies(
            Event event,
            List<AgencyCreateEventPricePolicyRequest> requests
    ) {
        Set<PricePolicyKey> keys = new LinkedHashSet<>();
        List<EventPricePolicy> policies = new ArrayList<>();

        for (AgencyCreateEventPricePolicyRequest request : requests) {
            PricePolicyKey key = new PricePolicyKey(request.priceGrade(), request.audienceType());
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
        Map<PricePolicyKey, EventPricePolicy> pricePolicyByKey = new LinkedHashMap<>();
        for (EventPricePolicy savedPolicy : savedPolicies) {
            pricePolicyByKey.put(new PricePolicyKey(savedPolicy.getPriceGrade(), savedPolicy.getAudienceType()), savedPolicy);
        }
        return pricePolicyByKey;
    }

    /**
     * 공연 회차를 생성합니다.
     *
     * @param event 공연 엔티티
     * @param requests 회차 생성 요청 목록
     * @return 생성된 회차 엔티티 목록
     */
    private List<EventSession> createSessions(
            Event event,
            List<AgencyCreateEventSessionRequest> requests
    ) {
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

    /**
     * 공연장 좌석을 기준으로 공연 좌석을 생성합니다.
     *
     * @param event 공연 엔티티
     * @param venueId 공연장 식별자
     * @param requests 좌석 매핑 요청 목록
     * @param pricePolicyByKey 가격 정책 조합 키 기준 맵
     * @return 생성된 공연 좌석 목록
     */
    private List<EventSeat> createEventSeats(
            Event event,
            Long venueId,
            List<AgencyCreateEventSeatRequest> requests,
            Map<PricePolicyKey, EventPricePolicy> pricePolicyByKey
    ) {
        Set<Long> venueSeatIds = new LinkedHashSet<>();
        for (AgencyCreateEventSeatRequest request : requests) {
            validateDuplicateVenueSeat(venueSeatIds, request.venueSeatId());
        }

        List<VenueSeat> venueSeats = getVenueSeatsOrThrow(venueSeatIds);

        Map<Long, VenueSeat> venueSeatById = new LinkedHashMap<>();
        for (VenueSeat venueSeat : venueSeats) {
            validateVenueSeatBelongsToVenue(venueId, venueSeat);
            venueSeatById.put(venueSeat.getId(), venueSeat);
        }

        // 이벤트 구역은 실제 선택된 공연장 구역만 복제해서 생성합니다.
        Map<Long, EventSection> eventSectionByVenueSectionId = createEventSections(event, venueId, venueSeats);
        List<EventSeat> eventSeats = new ArrayList<>();

        for (AgencyCreateEventSeatRequest request : requests) {
            VenueSeat venueSeat = venueSeatById.get(request.venueSeatId());
            EventPricePolicy pricePolicy = getPricePolicy(pricePolicyByKey, request.priceGrade(), request.audienceType());

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

    /**
     * 실제 사용된 공연장 구역만 복제하여 공연 구역을 생성합니다.
     *
     * @param event 공연 엔티티
     * @param venueId 공연장 식별자
     * @param venueSeats 선택된 공연장 좌석 목록
     * @return 공연장 구역 ID 기준 공연 구역 맵
     */
    private Map<Long, EventSection> createEventSections(
            Event event,
            Long venueId,
            List<VenueSeat> venueSeats
    ) {
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

    /**
     * 회차별 좌석을 생성합니다.
     *
     * @param sessions 생성된 회차 목록
     * @param eventSeats 생성된 공연 좌석 목록
     */
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

    /**
     * 회차 시작/종료 시각과 예매 시작/종료 시각의 선후관계를 검증합니다.
     *
     * @param request 회차 생성 요청 DTO
     */
    private void validateSessionTimeline(AgencyCreateEventSessionRequest request) {
        if (!request.startAt().isBefore(request.endAt())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "회차 시작 시각은 종료 시각보다 빨라야 합니다.");
        }
        if (!request.salesOpenAt().isBefore(request.salesCloseAt())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "회차 예매 시작 시각은 종료 시각보다 빨라야 합니다.");
        }
    }

    /**
     * 기획사를 조회합니다.
     *
     * @param organizerId 기획사 식별자
     * @return 조회된 기획사 엔티티
     */
    private Organizer getOrganizerOrThrow(Long organizerId) {
        return organizerRepository.findById(organizerId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "기획사를 찾을 수 없습니다."));
    }

    /**
     * 공연장을 조회합니다.
     *
     * @param venueId 공연장 식별자
     * @return 조회된 공연장 엔티티
     */
    private Venue getVenueOrThrow(Long venueId) {
        return venueRepository.findById(venueId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "공연장을 찾을 수 없습니다."));
    }

    /**
     * 카테고리를 조회합니다.
     *
     * @param categoryId 카테고리 식별자
     * @return 조회된 카테고리 엔티티
     */
    private Category getCategoryOrThrow(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "카테고리를 찾을 수 없습니다."));
    }

    /**
     * 공연장 좌석 목록을 조회합니다.
     *
     * @param venueSeatIds 공연장 좌석 식별자 목록
     * @return 조회된 공연장 좌석 목록
     */
    private List<VenueSeat> getVenueSeatsOrThrow(Set<Long> venueSeatIds) {
        List<VenueSeat> venueSeats = venueSeatRepository.findByIdIn(venueSeatIds);
        validateVenueSeatCount(venueSeatIds, venueSeats);
        return venueSeats;
    }

    /**
     * 공연장 좌석 중복 여부를 검증합니다.
     *
     * @param venueSeatIds 이미 확인한 공연장 좌석 식별자 목록
     * @param venueSeatId 이번에 확인할 공연장 좌석 식별자
     */
    private void validateDuplicateVenueSeat(Set<Long> venueSeatIds, Long venueSeatId) {
        if (!venueSeatIds.add(venueSeatId)) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "좌석이 중복되었습니다: " + venueSeatId);
        }
    }

    /**
     * 요청한 좌석 수와 조회된 좌석 수가 일치하는지 검증합니다.
     *
     * @param venueSeatIds 요청한 공연장 좌석 식별자 목록
     * @param venueSeats 조회된 공연장 좌석 목록
     */
    private void validateVenueSeatCount(Set<Long> venueSeatIds, List<VenueSeat> venueSeats) {
        if (venueSeats.size() != venueSeatIds.size()) {
            throw new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "일부 공연장 좌석을 찾을 수 없습니다.");
        }
    }

    /**
     * 공연장 좌석이 현재 공연장에 속하는지 검증합니다.
     *
     * @param venueId 공연장 식별자
     * @param venueSeat 공연장 좌석 엔티티
     */
    private void validateVenueSeatBelongsToVenue(Long venueId, VenueSeat venueSeat) {
        if (!venueId.equals(venueSeat.getVenueId())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "다른 공연장의 좌석이 포함되어 있습니다.");
        }
    }

    /**
     * 가격 정책 조합 키로 가격 정책을 조회합니다.
     *
     * @param pricePolicyByKey 가격 정책 조합 키 기준 맵
     * @param priceGrade 가격 등급
     * @param audienceType 관람 대상 유형
     * @return 조회된 가격 정책 엔티티
     */
    private EventPricePolicy getPricePolicy(
            Map<PricePolicyKey, EventPricePolicy> pricePolicyByKey,
            String priceGrade,
            String audienceType
    ) {
        EventPricePolicy pricePolicy = pricePolicyByKey.get(new PricePolicyKey(priceGrade, audienceType));
        if (pricePolicy == null) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "좌석에 연결할 가격 정책을 찾을 수 없습니다.");
        }
        return pricePolicy;
    }

    /**
     * 가격 정책 조합을 식별하는 내부 키 객체입니다.
     */
    private record PricePolicyKey(
            String priceGrade,
            String audienceType
    ) {
    }
}
