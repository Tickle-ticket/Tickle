package com.ssafy.tickle.agency.event.application;

import com.ssafy.tickle.agency.event.application.dto.CreatedEventSeat;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventSeatGroupRequest;
import com.ssafy.tickle.category.domain.Category;
import com.ssafy.tickle.category.infrastructure.persistence.CategoryRepository;
import com.ssafy.tickle.common.domain.SeatGrade;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventPricePolicyRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.seat.domain.EventSeat;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSeatRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSectionRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.organizer.domain.Organizer;
import com.ssafy.tickle.organizer.infrastructure.persistence.OrganizerRepository;
import com.ssafy.tickle.venue.domain.Venue;
import com.ssafy.tickle.venue.domain.VenueSeat;
import com.ssafy.tickle.venue.domain.VenueSection;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueRepository;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueSeatRepository;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueSectionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("AgencyEventSeatBatchService 통합 테스트")
class AgencyEventSeatBatchServiceTest {

    @Autowired
    private AgencyEventSeatBatchService agencyEventSeatBatchService;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventPricePolicyRepository eventPricePolicyRepository;

    @Autowired
    private EventSessionRepository eventSessionRepository;

    @Autowired
    private EventSeatRepository eventSeatRepository;

    @Autowired
    private SessionSeatRepository sessionSeatRepository;

    @Autowired
    private EventSectionRepository eventSectionRepository;

    @Autowired
    private OrganizerRepository organizerRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private VenueSectionRepository venueSectionRepository;

    @Autowired
    private VenueSeatRepository venueSeatRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private Organizer organizer;
    private Venue venue;
    private Category category;
    private VenueSection vipSection;
    private VenueSection rSection;
    private VenueSeat vipSeat1;
    private VenueSeat vipSeat2;
    private VenueSeat rSeat1;
    private VenueSeat rSeat2;

    @BeforeEach
    void setUp() {
        organizer = organizerRepository.save(createOrganizer("테스트 기획사"));
        venue = venueRepository.save(createVenue("테스트 공연장"));
        category = categoryRepository.save(createCategory("콘서트"));

        vipSection = venueSectionRepository.save(createVenueSection(venue, "VIP", 1));
        rSection = venueSectionRepository.save(createVenueSection(venue, "R", 2));

        vipSeat1 = venueSeatRepository.save(createVenueSeat(vipSection, venue.getId(), "A", "1", "A1", SeatGrade.VIP));
        vipSeat2 = venueSeatRepository.save(createVenueSeat(vipSection, venue.getId(), "A", "2", "A2", SeatGrade.VIP));
        rSeat1 = venueSeatRepository.save(createVenueSeat(rSection, venue.getId(), "B", "1", "B1", SeatGrade.R));
        rSeat2 = venueSeatRepository.save(createVenueSeat(rSection, venue.getId(), "B", "2", "B2", SeatGrade.R));
    }

    @AfterEach
    void tearDown() {
        sessionSeatRepository.deleteAllInBatch();
        eventSeatRepository.deleteAllInBatch();
        eventSectionRepository.deleteAllInBatch();
        eventSessionRepository.deleteAllInBatch();
        eventPricePolicyRepository.deleteAllInBatch();
        eventRepository.deleteAllInBatch();
        venueSeatRepository.deleteAllInBatch();
        venueSectionRepository.deleteAllInBatch();
        venueRepository.deleteAllInBatch();
        categoryRepository.deleteAllInBatch();
        organizerRepository.deleteAllInBatch();
    }

    @Test
    @DisplayName("좌석 그룹과 회차를 등록하면 공연 좌석과 회차 좌석이 저장된다")
    void createSeats_success() {
        Event event = eventRepository.save(createEvent("좌석 공연"));
        eventPricePolicyRepository.saveAll(List.of(
                createPricePolicy(event, SeatGrade.VIP, 220000),
                createPricePolicy(event, SeatGrade.R, 150000)
        ));

        List<CreatedEventSeat> createdEventSeats = agencyEventSeatBatchService.createEventSeats(
                event.getId(),
                List.of(
                        new AgencyCreateEventSeatGroupRequest(SeatGrade.VIP, List.of(vipSeat1.getId(), vipSeat2.getId())),
                        new AgencyCreateEventSeatGroupRequest(SeatGrade.R, List.of(rSeat1.getId(), rSeat2.getId()))
                )
        );

        List<EventSession> sessions = eventSessionRepository.saveAll(List.of(
                createSession(event, 1, Instant.parse("2026-08-01T10:00:00Z")),
                createSession(event, 2, Instant.parse("2026-08-02T10:00:00Z"))
        ));

        agencyEventSeatBatchService.createSessionSeats(sessions, createdEventSeats);

        assertThat(createdEventSeats).hasSize(4);
        assertThat(eventSectionRepository.count()).isEqualTo(2);
        assertThat(eventSeatRepository.count()).isEqualTo(4);
        assertThat(sessionSeatRepository.count()).isEqualTo(8);

        List<EventSeat> eventSeats = eventSeatRepository.findAll();
        assertThat(eventSeats)
                .extracting(EventSeat::getSeatGrade)
                .containsExactlyInAnyOrder(SeatGrade.VIP, SeatGrade.VIP, SeatGrade.R, SeatGrade.R);

        List<SessionSeat> sessionSeats = sessionSeatRepository.findAll();
        assertThat(sessionSeats)
                .allSatisfy(sessionSeat -> {
                    assertThat(sessionSeat.getSaleStatus()).isEqualTo(SessionSeat.SaleStatus.AVAILABLE);
                    assertThat(sessionSeat.getVersionNo()).isEqualTo(1L);
                });
    }

    @Test
    @DisplayName("같은 가격 등급 그룹이 중복되면 예외가 발생한다")
    void createSeats_duplicatePriceGrade_fails() {
        Event event = eventRepository.save(createEvent("중복 좌석 공연"));
        eventPricePolicyRepository.saveAll(List.of(
                createPricePolicy(event, SeatGrade.VIP, 220000),
                createPricePolicy(event, SeatGrade.R, 150000)
        ));

        assertThatThrownBy(() -> agencyEventSeatBatchService.createEventSeats(
                event.getId(),
                List.of(
                        new AgencyCreateEventSeatGroupRequest(SeatGrade.VIP, List.of(vipSeat1.getId())),
                        new AgencyCreateEventSeatGroupRequest(SeatGrade.VIP, List.of(vipSeat2.getId()))
                )
        ))
                .isInstanceOf(BaseException.class)
                .extracting("errorCode")
                .isEqualTo(GlobalErrorCode.INVALID_REQUEST);
    }

    @Test
    @DisplayName("가격 정책이 없는 좌석 등급으로 등록하면 예외가 발생한다")
    void createSeats_missingPricePolicy_fails() {
        Event event = eventRepository.save(createEvent("가격 정책 누락 공연"));
        eventPricePolicyRepository.save(createPricePolicy(event, SeatGrade.VIP, 220000));

        assertThatThrownBy(() -> agencyEventSeatBatchService.createEventSeats(
                event.getId(),
                List.of(new AgencyCreateEventSeatGroupRequest(SeatGrade.R, List.of(rSeat1.getId())))
        ))
                .isInstanceOf(BaseException.class)
                .extracting("errorCode")
                .isEqualTo(GlobalErrorCode.INVALID_REQUEST);
    }

    private Organizer createOrganizer(String organizerName) {
        return Organizer.builder()
                .organizerName(organizerName)
                .businessNo("123-45-67890")
                .contactEmail("organizer@test.com")
                .contactPhone("010-1234-5678")
                .status(Organizer.Status.ACTIVE)
                .build();
    }

    private Venue createVenue(String venueName) {
        return Venue.builder()
                .venueName(venueName)
                .timezoneCode("Asia/Seoul")
                .countryCode("KR")
                .address("서울 송파구 올림픽로 25")
                .addressLine2("101호")
                .cityName("서울")
                .capacity(15_000)
                .build();
    }

    private Category createCategory(String categoryName) {
        return Category.builder()
                .categoryName(categoryName)
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
            VenueSection section,
            Long venueId,
            String rowLabel,
            String seatNumber,
            String seatLabel,
            SeatGrade seatGrade
    ) {
        return VenueSeat.builder()
                .section(section)
                .venueId(venueId)
                .rowLabel(rowLabel)
                .seatNumber(seatNumber)
                .seatLabel(seatLabel)
                .seatGrade(seatGrade)
                .build();
    }

    private Event createEvent(String title) {
        return Event.builder()
                .organizer(organizer)
                .venue(venue)
                .title(title)
                .category(category)
                .eventStartAt(Instant.parse("2026-07-01T10:00:00Z"))
                .eventEndAt(Instant.parse("2026-07-01T12:00:00Z"))
                .metadata(new Event.EventMetadata(List.of("test")))
                .notice("테스트 공지")
                .status(Event.Status.PENDING)
                .build();
    }

    private EventSession createSession(Event event, int sessionNo, Instant startAt) {
        return EventSession.builder()
                .event(event)
                .sessionNo(sessionNo)
                .startAt(startAt)
                .endAt(startAt.plusSeconds(7_200))
                .salesOpenAt(startAt.minusSeconds(604_800))
                .salesCloseAt(startAt.minusSeconds(3_600))
                .status(EventSession.Status.PENDING)
                .build();
    }

    private EventPricePolicy createPricePolicy(Event event, SeatGrade priceGrade, int amount) {
        return EventPricePolicy.builder()
                .event(event)
                .priceGrade(priceGrade)
                .priceAmount(BigDecimal.valueOf(amount))
                .discountInfo(List.of())
                .currencyCode("KRW")
                .displayOrder(priceGrade.ordinal())
                .build();
    }
}
