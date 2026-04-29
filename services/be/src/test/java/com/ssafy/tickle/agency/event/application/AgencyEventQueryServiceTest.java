package com.ssafy.tickle.agency.event.application;

import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyEventDetailResponse;
import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyEventListResponse;
import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyEventSeatResponse;
import com.ssafy.tickle.category.domain.Category;
import com.ssafy.tickle.category.infrastructure.persistence.CategoryRepository;
import com.ssafy.tickle.common.domain.SeatGrade;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventImage;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventImageRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventPricePolicyRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.organizer.domain.Organizer;
import com.ssafy.tickle.organizer.infrastructure.persistence.OrganizerRepository;
import com.ssafy.tickle.seat.domain.EventSeat;
import com.ssafy.tickle.seat.domain.EventSection;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSeatRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSectionRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.venue.domain.Venue;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueRepository;
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
@DisplayName("AgencyEventQueryService 통합 테스트")
class AgencyEventQueryServiceTest {

    @Autowired
    private AgencyEventQueryService agencyEventQueryService;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventPricePolicyRepository eventPricePolicyRepository;

    @Autowired
    private EventImageRepository eventImageRepository;

    @Autowired
    private EventSessionRepository eventSessionRepository;

    @Autowired
    private EventSectionRepository eventSectionRepository;

    @Autowired
    private EventSeatRepository eventSeatRepository;

    @Autowired
    private SessionSeatRepository sessionSeatRepository;

    @Autowired
    private OrganizerRepository organizerRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private Organizer organizer;
    private Venue venue;
    private Category category;
    private Event detailEvent;
    private Event listEvent;
    private EventPricePolicy vipPolicy;
    private EventPricePolicy rPolicy;
    private EventSeat vipSeat1;
    private EventSeat vipSeat2;
    private EventSeat rSeat1;

    @BeforeEach
    void setUp() {
        organizer = organizerRepository.save(createOrganizer("조회 테스트 기획사"));
        venue = venueRepository.save(createVenue("조회 테스트 공연장"));
        category = categoryRepository.save(createCategory("콘서트"));

        detailEvent = eventRepository.save(createEvent(
                "상세 조회 공연",
                Instant.parse("2026-06-01T10:00:00Z"),
                Instant.parse("2026-08-01T23:59:59Z"),
                Instant.parse("2026-08-15T19:00:00Z"),
                Instant.parse("2026-08-17T22:00:00Z"),
                List.of("detail", "seat"),
                Event.Status.OPENED
        ));

        listEvent = eventRepository.save(createEvent(
                "목록 조회 비교 공연",
                Instant.parse("2026-07-01T10:00:00Z"),
                Instant.parse("2026-09-01T23:59:59Z"),
                Instant.parse("2026-09-15T19:00:00Z"),
                Instant.parse("2026-09-15T22:00:00Z"),
                List.of("list"),
                Event.Status.PENDING
        ));

        eventImageRepository.saveAll(List.of(
                createImage(detailEvent, EventImage.ImageType.POSTER, "https://cdn.test/poster.jpg", 0),
                createImage(detailEvent, EventImage.ImageType.THUMBNAIL, "https://cdn.test/poster.jpg", 0),
                createImage(detailEvent, EventImage.ImageType.DETAIL, "https://cdn.test/detail-1.jpg", 0),
                createImage(detailEvent, EventImage.ImageType.DETAIL, "https://cdn.test/detail-2.jpg", 1)
        ));

        vipPolicy = eventPricePolicyRepository.save(createPricePolicy(detailEvent, SeatGrade.VIP, 220000, 0));
        rPolicy = eventPricePolicyRepository.save(createPricePolicy(detailEvent, SeatGrade.R, 150000, 1));
        EventPricePolicy listPolicy = eventPricePolicyRepository.save(createPricePolicy(listEvent, SeatGrade.R, 132000, 0));

        EventSession detailSession1 = eventSessionRepository.save(createSession(
                detailEvent, 1,
                Instant.parse("2026-08-15T19:00:00Z"),
                Instant.parse("2026-06-01T10:00:00Z"),
                EventSession.Status.OPENED
        ));
        EventSession detailSession2 = eventSessionRepository.save(createSession(
                detailEvent, 2,
                Instant.parse("2026-08-16T19:00:00Z"),
                Instant.parse("2026-06-02T10:00:00Z"),
                EventSession.Status.PENDING
        ));
        EventSession listSession = eventSessionRepository.save(createSession(
                listEvent, 1,
                Instant.parse("2026-09-15T19:00:00Z"),
                Instant.parse("2026-07-01T10:00:00Z"),
                EventSession.Status.PENDING
        ));

        EventSection vipSection = eventSectionRepository.save(createEventSection(detailEvent, "VIP", 1));
        EventSection rSection = eventSectionRepository.save(createEventSection(detailEvent, "R", 2));
        EventSection listSectionSection = eventSectionRepository.save(createEventSection(listEvent, "R", 1));

        vipSeat1 = eventSeatRepository.save(createEventSeat(vipSection, vipPolicy, "A", "1", "A-1", SeatGrade.VIP));
        vipSeat2 = eventSeatRepository.save(createEventSeat(vipSection, vipPolicy, "A", "2", "A-2", SeatGrade.VIP));
        rSeat1 = eventSeatRepository.save(createEventSeat(rSection, rPolicy, "B", "1", "B-1", SeatGrade.R));
        EventSeat listSeat = eventSeatRepository.save(createEventSeat(listSectionSection, listPolicy, "C", "1", "C-1", SeatGrade.R));

        sessionSeatRepository.save(createSessionSeat(detailSession1, vipSeat1, vipSection.getId(), SessionSeat.SaleStatus.CONFIRMED));
        sessionSeatRepository.save(createSessionSeat(detailSession1, vipSeat2, vipSection.getId(), SessionSeat.SaleStatus.CONFIRMED));
        sessionSeatRepository.save(createSessionSeat(detailSession2, rSeat1, rSection.getId(), SessionSeat.SaleStatus.CONFIRMED));
        sessionSeatRepository.save(createSessionSeat(listSession, listSeat, listSectionSection.getId(), SessionSeat.SaleStatus.CONFIRMED));
    }

    @AfterEach
    void tearDown() {
        sessionSeatRepository.deleteAllInBatch();
        eventSeatRepository.deleteAllInBatch();
        eventSectionRepository.deleteAllInBatch();
        eventSessionRepository.deleteAllInBatch();
        eventImageRepository.deleteAllInBatch();
        eventPricePolicyRepository.deleteAllInBatch();
        eventRepository.deleteAllInBatch();
        venueRepository.deleteAllInBatch();
        categoryRepository.deleteAllInBatch();
        organizerRepository.deleteAllInBatch();
    }

    @Test
    @DisplayName("기획사 공연 목록 조회 시 예매율을 포함한 목록을 반환한다")
    void getEvents_success() {
        AgencyEventListResponse response = agencyEventQueryService.getEvents(organizer.getId(), 0, 20);

        assertThat(response.items()).hasSize(2);
        assertThat(response.items().get(0).eventName()).isEqualTo("목록 조회 비교 공연");
        assertThat(response.items().get(0).reservationRate()).isEqualByComparingTo("1.00");
        assertThat(response.items().get(1).eventName()).isEqualTo("상세 조회 공연");
        assertThat(response.items().get(1).reservationRate()).isEqualByComparingTo("3.00");
        assertThat(response.totalElements()).isEqualTo(2);
        assertThat(response.totalPages()).isEqualTo(1);
        assertThat(response.hasNext()).isFalse();
    }

    @Test
    @DisplayName("존재하지 않는 기획사로 목록 조회하면 예외가 발생한다")
    void getEvents_organizerNotFound() {
        assertThatThrownBy(() -> agencyEventQueryService.getEvents(Long.MAX_VALUE, 0, 20))
                .isInstanceOf(BaseException.class)
                .extracting("errorCode")
                .isEqualTo(GlobalErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("공연 상세 조회 시 기본정보, 가격정책, 회차를 함께 반환한다")
    void getEventDetail_success() {
        AgencyEventDetailResponse response = agencyEventQueryService.getEventDetail(detailEvent.getId());

        assertThat(response.eventId()).isEqualTo(detailEvent.getId());
        assertThat(response.basicInfo().organizerId()).isEqualTo(organizer.getId());
        assertThat(response.basicInfo().venueId()).isEqualTo(venue.getId());
        assertThat(response.basicInfo().categoryId()).isEqualTo(category.getId());
        assertThat(response.basicInfo().title()).isEqualTo("상세 조회 공연");
        assertThat(response.basicInfo().tags()).containsExactly("detail", "seat");
        assertThat(response.images()).hasSize(4);
        assertThat(response.images())
                .extracting(AgencyEventDetailResponse.ImageInfo::imageType, AgencyEventDetailResponse.ImageInfo::imageUrl)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(EventImage.ImageType.POSTER, "https://cdn.test/poster.jpg"),
                        org.assertj.core.groups.Tuple.tuple(EventImage.ImageType.THUMBNAIL, "https://cdn.test/poster.jpg"),
                        org.assertj.core.groups.Tuple.tuple(EventImage.ImageType.DETAIL, "https://cdn.test/detail-1.jpg"),
                        org.assertj.core.groups.Tuple.tuple(EventImage.ImageType.DETAIL, "https://cdn.test/detail-2.jpg")
                );

        assertThat(response.pricePolicies()).hasSize(2);
        assertThat(response.pricePolicies().get(0).priceGrade()).isEqualTo("VIP");
        assertThat(response.pricePolicies().get(0).priceAmount()).isEqualByComparingTo("220000");
        assertThat(response.pricePolicies().get(1).priceGrade()).isEqualTo("R");

        assertThat(response.sessions()).hasSize(2);
        assertThat(response.sessions())
                .extracting(AgencyEventDetailResponse.SessionInfo::sessionNo)
                .containsExactly(1, 2);
    }

    @Test
    @DisplayName("공연 좌석 조회 시 가격 등급별로 eventSeatId를 묶어서 반환한다")
    void getEventSeats_success() {
        AgencyEventSeatResponse response = agencyEventQueryService.getEventSeats(detailEvent.getId());

        assertThat(response.eventId()).isEqualTo(detailEvent.getId());
        assertThat(response.venueId()).isEqualTo(venue.getId());
        assertThat(response.seats()).hasSize(2);
        assertThat(response.seats().get(0).priceGrade()).isEqualTo("VIP");
        assertThat(response.seats().get(0).seatIds()).containsExactly(vipSeat1.getId(), vipSeat2.getId());
        assertThat(response.seats().get(1).priceGrade()).isEqualTo("R");
        assertThat(response.seats().get(1).seatIds()).containsExactly(rSeat1.getId());
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
                .capacity(100)
                .build();
    }

    private Category createCategory(String categoryName) {
        return Category.builder()
                .categoryName(categoryName)
                .build();
    }

    private Event createEvent(
            String title,
            Instant salesStartAt,
            Instant salesEndAt,
            Instant eventStartAt,
            Instant eventEndAt,
            List<String> tags,
            Event.Status status
    ) {
        return Event.builder()
                .organizer(organizer)
                .venue(venue)
                .title(title)
                .category(category)
                .salesStartAt(salesStartAt)
                .salesEndAt(salesEndAt)
                .eventStartAt(eventStartAt)
                .eventEndAt(eventEndAt)
                .metadata(new Event.EventMetadata(tags))
                .notice("테스트 공지")
                .status(status)
                .build();
    }

    private EventPricePolicy createPricePolicy(Event event, SeatGrade priceGrade, int amount, int displayOrder) {
        return EventPricePolicy.builder()
                .event(event)
                .priceGrade(priceGrade)
                .priceAmount(BigDecimal.valueOf(amount))
                .discountInfo(List.of())
                .currencyCode("KRW")
                .displayOrder(displayOrder)
                .build();
    }

    private EventImage createImage(Event event, EventImage.ImageType imageType, String imageUrl, int displayOrder) {
        return EventImage.builder()
                .event(event)
                .imageType(imageType)
                .imageUrl(imageUrl)
                .displayOrder(displayOrder)
                .build();
    }

    private EventSession createSession(
            Event event,
            int sessionNo,
            Instant startAt,
            Instant salesOpenAt,
            EventSession.Status status
    ) {
        return EventSession.builder()
                .event(event)
                .sessionNo(sessionNo)
                .startAt(startAt)
                .endAt(startAt.plusSeconds(7200))
                .salesOpenAt(salesOpenAt)
                .salesCloseAt(startAt.minusSeconds(3600))
                .status(status)
                .build();
    }

    private EventSection createEventSection(Event event, String sectionName, int displayOrder) {
        return EventSection.builder()
                .event(event)
                .venueId(venue.getId())
                .sectionName(sectionName)
                .displayOrder(displayOrder)
                .build();
    }

    private EventSeat createEventSeat(
            EventSection section,
            EventPricePolicy pricePolicy,
            String rowLabel,
            String seatNumber,
            String seatLabel,
            SeatGrade seatGrade
    ) {
        return EventSeat.builder()
                .eventSection(section)
                .eventPricePolicy(pricePolicy)
                .venueId(venue.getId())
                .rowLabel(rowLabel)
                .seatNumber(seatNumber)
                .seatLabel(seatLabel)
                .seatGrade(seatGrade)
                .build();
    }

    private SessionSeat createSessionSeat(
            EventSession session,
            EventSeat eventSeat,
            Long eventSectionId,
            SessionSeat.SaleStatus saleStatus
    ) {
        return SessionSeat.builder()
                .session(session)
                .eventSeat(eventSeat)
                .eventSectionId(eventSectionId)
                .saleStatus(saleStatus)
                .versionNo(1L)
                .build();
    }
}
