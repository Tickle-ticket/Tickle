package com.ssafy.tickle.event.application;

import com.ssafy.tickle.event.domain.Category;
import com.ssafy.tickle.event.domain.Event;
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
import com.ssafy.tickle.seat.infrastructure.persistence.EventSeatRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSectionRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.venue.domain.Venue;
import com.ssafy.tickle.venue.domain.VenueSeat;
import com.ssafy.tickle.venue.domain.VenueSection;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueRepository;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueSeatRepository;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueSectionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("AgencyEventService 통합 테스트")
class AgencyEventServiceTest {

    @Autowired
    private AgencyEventService agencyEventService;
    @Autowired
    private EventRepository eventRepository;
    @Autowired
    private EventSessionRepository eventSessionRepository;
    @Autowired
    private EventPricePolicyRepository eventPricePolicyRepository;
    @Autowired
    private EventSectionRepository eventSectionRepository;
    @Autowired
    private EventSeatRepository eventSeatRepository;
    @Autowired
    private SessionSeatRepository sessionSeatRepository;
    @Autowired
    private OrganizerRepository organizerRepository;
    @Autowired
    private CategoryRepository categoryRepository;
    @Autowired
    private VenueRepository venueRepository;
    @Autowired
    private VenueSectionRepository venueSectionRepository;
    @Autowired
    private VenueSeatRepository venueSeatRepository;

    @AfterEach
    void tearDown() {
        sessionSeatRepository.deleteAllInBatch();
        eventSeatRepository.deleteAllInBatch();
        eventSectionRepository.deleteAllInBatch();
        eventPricePolicyRepository.deleteAllInBatch();
        eventSessionRepository.deleteAllInBatch();
        eventRepository.deleteAllInBatch();
        venueSeatRepository.deleteAllInBatch();
        venueSectionRepository.deleteAllInBatch();
        venueRepository.deleteAllInBatch();
        categoryRepository.deleteAllInBatch();
        organizerRepository.deleteAllInBatch();
    }

    @Test
    @DisplayName("공연장 골격을 조회한다")
    void getVenueTemplate_success() {
        Venue venue = venueRepository.save(createVenue());
        VenueSection section = venueSectionRepository.save(createVenueSection(venue, "R석", 1));
        venueSeatRepository.save(createVenueSeat(venue, section, "A", "1", "A-1", VenueSeat.SeatType.R));

        AgencyVenueTemplateResponse response = agencyEventService.getVenueTemplate(venue.getId());

        assertThat(response.venueId()).isEqualTo(venue.getId());
        assertThat(response.sections()).hasSize(1);
        assertThat(response.sections().get(0).seats()).hasSize(1);
    }

    @Test
    @DisplayName("공연, 회차, 좌석 정보를 한 번에 등록한다")
    void createEvent_success() {
        Organizer organizer = organizerRepository.save(createOrganizer());
        Category category = categoryRepository.save(createCategory());
        Venue venue = venueRepository.save(createVenue());
        VenueSection vipSection = venueSectionRepository.save(createVenueSection(venue, "VIP", 1));
        VenueSection rSection = venueSectionRepository.save(createVenueSection(venue, "R", 2));
        VenueSeat vipSeat = venueSeatRepository.save(createVenueSeat(venue, vipSection, "A", "1", "A-1", VenueSeat.SeatType.VIP));
        VenueSeat rSeat = venueSeatRepository.save(createVenueSeat(venue, rSection, "B", "1", "B-1", VenueSeat.SeatType.R));

        AgencyCreateEventResponse response = agencyEventService.createEvent(new AgencyCreateEventRequest(
                organizer.getId(),
                venue.getId(),
                category.getId(),
                "기획사 등록 공연",
                Instant.parse("2026-05-01T00:00:00Z"),
                Instant.parse("2026-05-20T00:00:00Z"),
                Instant.parse("2026-06-01T19:00:00Z"),
                Instant.parse("2026-06-01T22:00:00Z"),
                List.of("admin", "create"),
                "기획사 등록 테스트용 공연",
                List.of(
                        new AgencyCreateEventPricePolicyRequest("VIP", "ALL", BigDecimal.valueOf(150000), "KRW", 1),
                        new AgencyCreateEventPricePolicyRequest("R", "ALL", BigDecimal.valueOf(100000), "KRW", 2)
                ),
                List.of(
                        new AgencyCreateEventSessionRequest(
                                1,
                                Instant.parse("2026-06-01T19:00:00Z"),
                                Instant.parse("2026-06-01T22:00:00Z"),
                                Instant.parse("2026-05-01T00:00:00Z"),
                                Instant.parse("2026-05-31T23:59:59Z")
                        ),
                        new AgencyCreateEventSessionRequest(
                                2,
                                Instant.parse("2026-06-02T19:00:00Z"),
                                Instant.parse("2026-06-02T22:00:00Z"),
                                Instant.parse("2026-05-02T00:00:00Z"),
                                Instant.parse("2026-06-01T23:59:59Z")
                        )
                ),
                List.of(
                        new AgencyCreateEventSeatRequest(vipSeat.getId(), "VIP", "ALL"),
                        new AgencyCreateEventSeatRequest(rSeat.getId(), "R", "ALL")
                )
        ));

        Event savedEvent = eventRepository.findById(response.eventId()).orElseThrow();
        List<EventSession> sessions = eventSessionRepository.findByEventIdOrderByStartAtAsc(savedEvent.getId());

        assertThat(savedEvent.getTitle()).isEqualTo("기획사 등록 공연");
        assertThat(response.title()).isEqualTo("기획사 등록 공연");
        assertThat(sessions).hasSize(2);
    }

    private Organizer createOrganizer() {
        return Organizer.builder()
                .organizerName("테스트 기획사")
                .businessNo("123-45-67890")
                .contactEmail("organizer@test.com")
                .contactPhone("02-1234-5678")
                .status(Organizer.Status.ACTIVE)
                .build();
    }

    private Category createCategory() {
        return Category.builder()
                .categoryName("콘서트")
                .build();
    }

    private Venue createVenue() {
        return Venue.builder()
                .venueName("테스트 공연장")
                .timezoneCode("Asia/Seoul")
                .countryCode("KR")
                .address("서울시 강남구 테스트길 1")
                .addressLine2("1층")
                .cityName("서울")
                .capacity(1000)
                .build();
    }

    private VenueSection createVenueSection(Venue venue, String sectionName, int displayOrder) {
        return VenueSection.builder()
                .venue(venue)
                .sectionName(sectionName)
                .displayOrder(displayOrder)
                .build();
    }

    private VenueSeat createVenueSeat(
            Venue venue,
            VenueSection section,
            String rowLabel,
            String seatNumber,
            String seatLabel,
            VenueSeat.SeatType seatType
    ) {
        return VenueSeat.builder()
                .section(section)
                .venueId(venue.getId())
                .rowLabel(rowLabel)
                .seatNumber(seatNumber)
                .seatLabel(seatLabel)
                .seatType(seatType)
                .build();
    }
}
