package com.ssafy.tickle.agency.event.application;

import com.ssafy.tickle.category.domain.Category;
import com.ssafy.tickle.category.infrastructure.persistence.CategoryRepository;
import com.ssafy.tickle.common.domain.SeatGrade;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventImageRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventPricePolicyRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.favorite.domain.Favorite;
import com.ssafy.tickle.favorite.infrastructure.persistence.FavoriteRepository;
import com.ssafy.tickle.organizer.domain.Organizer;
import com.ssafy.tickle.organizer.infrastructure.persistence.OrganizerRepository;
import com.ssafy.tickle.seat.domain.EventSeat;
import com.ssafy.tickle.seat.domain.EventSection;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSeatRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSectionRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.domain.UserRole;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import com.ssafy.tickle.venue.domain.Venue;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("AgencyEventDeleteService 통합 테스트")
class AgencyEventDeleteServiceTest {

    @Autowired
    private AgencyEventDeleteService agencyEventDeleteService;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventImageRepository eventImageRepository;

    @Autowired
    private EventPricePolicyRepository eventPricePolicyRepository;

    @Autowired
    private EventSessionRepository eventSessionRepository;

    @Autowired
    private EventSectionRepository eventSectionRepository;

    @Autowired
    private EventSeatRepository eventSeatRepository;

    @Autowired
    private SessionSeatRepository sessionSeatRepository;

    @Autowired
    private FavoriteRepository favoriteRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrganizerRepository organizerRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @AfterEach
    void tearDown() {
        favoriteRepository.deleteAllInBatch();
        sessionSeatRepository.deleteAllInBatch();
        eventSeatRepository.deleteAllInBatch();
        eventSectionRepository.deleteAllInBatch();
        eventSessionRepository.deleteAllInBatch();
        eventImageRepository.deleteAllInBatch();
        eventPricePolicyRepository.deleteAllInBatch();
        eventRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
        venueRepository.deleteAllInBatch();
        categoryRepository.deleteAllInBatch();
        organizerRepository.deleteAllInBatch();
    }

    @Test
    @DisplayName("예매 시작 전 공연 삭제 시 하위 데이터까지 함께 삭제된다")
    void deleteEvent_success() {
        Organizer organizer = organizerRepository.save(createOrganizer("삭제 테스트 기획사"));
        Venue venue = venueRepository.save(createVenue("삭제 테스트 공연장"));
        Category category = categoryRepository.save(createCategory("콘서트"));
        User user = userRepository.save(createUser("delete-user-1", "delete1@test.com"));
        User agencyUser = userRepository.save(createAgencyUser(1002L, organizer.getId()));

        Event event = eventRepository.save(createEvent(
                organizer,
                venue,
                category,
                "삭제 가능 공연",
                Instant.now().plusSeconds(86400)
        ));
        EventPricePolicy pricePolicy = eventPricePolicyRepository.save(createPricePolicy(event, SeatGrade.VIP, 220000, 0));
        EventSession session = eventSessionRepository.save(createSession(event, 1, Instant.parse("2026-08-15T19:00:00Z")));
        EventSection section = eventSectionRepository.save(createEventSection(event, venue.getId(), "VIP", 1));
        EventSeat eventSeat = eventSeatRepository.save(createEventSeat(section, pricePolicy, venue.getId(), "A", "1", "A-1", SeatGrade.VIP));
        sessionSeatRepository.save(createSessionSeat(session, eventSeat, section.getId(), SessionSeat.SaleStatus.AVAILABLE));
        favoriteRepository.save(Favorite.builder()
                .user(user)
                .event(event)
                .build());

        agencyEventDeleteService.deleteEvent(agencyUser.getId(), event.getId());

        assertThat(eventRepository.findById(event.getId())).isEmpty();
        assertThat(eventPricePolicyRepository.findByEventIdOrderByDisplayOrderAsc(event.getId())).isEmpty();
        assertThat(eventSessionRepository.findByEventIdOrderByStartAtAsc(event.getId())).isEmpty();
        assertThat(eventSectionRepository.findByEventIdOrderByDisplayOrderAsc(event.getId())).isEmpty();
        assertThat(eventSeatRepository.findByEventSection_Event_IdOrderByEventSection_DisplayOrderAscRowLabelAscSeatNumberAsc(event.getId())).isEmpty();
        assertThat(favoriteRepository.existsByUser_IdAndEvent_Id(user.getId(), event.getId())).isFalse();
        assertThat(sessionSeatRepository.count()).isZero();
    }

    @Test
    @DisplayName("예매 시작 후 공연을 삭제하려고 하면 예외가 발생한다")
    void deleteEvent_salesAlreadyStarted() {
        Organizer organizer = organizerRepository.save(createOrganizer("삭제 실패 기획사"));
        Venue venue = venueRepository.save(createVenue("삭제 실패 공연장"));
        Category category = categoryRepository.save(createCategory("콘서트"));
        User agencyUser = userRepository.save(createAgencyUser(1002L, organizer.getId()));
        Event event = eventRepository.save(createEvent(
                organizer,
                venue,
                category,
                "삭제 불가 공연",
                Instant.now().minusSeconds(60)
        ));

        assertThatThrownBy(() -> agencyEventDeleteService.deleteEvent(agencyUser.getId(), event.getId()))
                .isInstanceOf(BaseException.class)
                .extracting("errorCode")
                .isEqualTo(GlobalErrorCode.INVALID_REQUEST);

        assertThat(eventRepository.findById(event.getId())).isPresent();
    }

    @Test
    @DisplayName("존재하지 않는 공연을 삭제하려고 하면 예외가 발생한다")
    void deleteEvent_notFound() {
        Organizer organizer = organizerRepository.save(createOrganizer("삭제 실패 기획사"));
        User agencyUser = userRepository.save(createAgencyUser(1002L, organizer.getId()));

        assertThatThrownBy(() -> agencyEventDeleteService.deleteEvent(agencyUser.getId(), Long.MAX_VALUE))
                .isInstanceOf(BaseException.class)
                .extracting("errorCode")
                .isEqualTo(GlobalErrorCode.RESOURCE_NOT_FOUND);
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

    private User createUser(String userNo, String email) {
        return User.builder()
                .id(1001L)
                .userNo(userNo)
                .email(email)
                .phoneNumber("010-1234-5678")
                .name("테스트 유저")
                .nickname("tester")
                .profileImageUrl("https://example.com/profile.jpg")
                .birthDate(LocalDate.of(1999, 1, 1))
                .role(UserRole.USER)
                .status(User.Status.ACTIVE)
                .build();
    }

    private User createAgencyUser(Long userId, Long organizerId) {
        return User.builder()
                .id(userId)
                .userNo("USER-" + userId)
                .name("기획자")
                .role(UserRole.ORGANIZER)
                .status(User.Status.ACTIVE)
                .organizerId(organizerId)
                .build();
    }

    private Event createEvent(
            Organizer organizer,
            Venue venue,
            Category category,
            String title,
            Instant salesStartAt
    ) {
        return Event.builder()
                .organizer(organizer)
                .venue(venue)
                .title(title)
                .category(category)
                .salesStartAt(salesStartAt)
                .salesEndAt(salesStartAt.plusSeconds(604800))
                .eventStartAt(Instant.parse("2026-08-15T19:00:00Z"))
                .eventEndAt(Instant.parse("2026-08-15T22:00:00Z"))
                .metadata(new Event.EventMetadata(List.of("delete")))
                .notice("삭제 테스트 공지")
                .status(Event.Status.PENDING)
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

    private EventSession createSession(Event event, int sessionNo, Instant startAt) {
        return EventSession.builder()
                .event(event)
                .sessionNo(sessionNo)
                .startAt(startAt)
                .endAt(startAt.plusSeconds(7200))
                .salesOpenAt(startAt.minusSeconds(604800))
                .salesCloseAt(startAt.minusSeconds(3600))
                .status(EventSession.Status.PENDING)
                .build();
    }

    private EventSection createEventSection(Event event, Long venueId, String sectionName, int displayOrder) {
        return EventSection.builder()
                .event(event)
                .venueId(venueId)
                .sectionName(sectionName)
                .displayOrder(displayOrder)
                .build();
    }

    private EventSeat createEventSeat(
            EventSection section,
            EventPricePolicy pricePolicy,
            Long venueId,
            String rowLabel,
            String seatNumber,
            String seatLabel,
            SeatGrade seatGrade
    ) {
        return EventSeat.builder()
                .eventSection(section)
                .eventPricePolicy(pricePolicy)
                .venueId(venueId)
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
