package com.ssafy.tickle.reservation.application;

import com.ssafy.tickle.category.domain.Category;
import com.ssafy.tickle.category.infrastructure.persistence.CategoryRepository;
import com.ssafy.tickle.common.domain.SeatGrade;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventPricePolicyRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.organizer.domain.Organizer;
import com.ssafy.tickle.organizer.infrastructure.persistence.OrganizerRepository;
import com.ssafy.tickle.reservation.presentation.dto.BookingOptionsRequest;
import com.ssafy.tickle.reservation.presentation.dto.BookingOptionsResponse;
import com.ssafy.tickle.seat.application.SeatService;
import com.ssafy.tickle.seat.domain.EventSeat;
import com.ssafy.tickle.seat.domain.EventSection;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSeatRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSectionRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.seat.infrastructure.redis.SeatHoldKeyStore;
import com.ssafy.tickle.seat.presentation.dto.SeatHoldRequest;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.domain.UserRole;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import com.ssafy.tickle.venue.domain.Venue;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * BookingOptionService 통합 테스트입니다.
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("BookingOptionService 통합 테스트")
class BookingOptionServiceTest {

    @Autowired private BookingOptionService bookingOptionService;
    @Autowired private SeatService seatService;

    @Autowired private UserRepository userRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private EventSessionRepository eventSessionRepository;
    @Autowired private OrganizerRepository organizerRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private VenueRepository venueRepository;
    @Autowired private EventPricePolicyRepository eventPricePolicyRepository;
    @Autowired private EventSectionRepository eventSectionRepository;
    @Autowired private EventSeatRepository eventSeatRepository;
    @Autowired private SessionSeatRepository sessionSeatRepository;

    private User user;
    private Organizer organizer;
    private Venue venue;
    private Category category;
    private Event event;
    private EventSession session;
    private EventPricePolicy pricePolicy;

    @BeforeEach
    void setUp() {
        user = userRepository.save(createUser());
        organizer = organizerRepository.save(createOrganizer());
        venue = venueRepository.save(createVenue());
        category = categoryRepository.save(createCategory());
        event = eventRepository.save(createEvent());
        pricePolicy = eventPricePolicyRepository.save(createPricePolicy(event));
        session = eventSessionRepository.save(createSession(event));
    }

    @AfterEach
    void tearDown() {
        sessionSeatRepository.deleteAllInBatch();
        eventSeatRepository.deleteAllInBatch();
        eventSectionRepository.deleteAllInBatch();
        eventPricePolicyRepository.deleteAllInBatch();
        eventSessionRepository.deleteAllInBatch();
        eventRepository.deleteAllInBatch();
        categoryRepository.deleteAllInBatch();
        venueRepository.deleteAllInBatch();
        organizerRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
    }

    @Nested
    @DisplayName("권종 선택 옵션 조회")
    class GetBookingOptions {

        @Test
        @DisplayName("유효한 hold 좌석이면 할인 옵션을 반환한다")
        void getBookingOptions_success() {
            // given
            SessionSeat firstSeat = createAvailableSeat("A", "1");
            SessionSeat secondSeat = createAvailableSeat("A", "2");
            holdSeats(firstSeat.getId(), secondSeat.getId());

            // when
            BookingOptionsResponse response = bookingOptionService.getBookingOptions(
                    user.getId(),
                    new BookingOptionsRequest(
                            event.getId(),
                            session.getId(),
                            List.of(firstSeat.getId(), secondSeat.getId())
                    )
            );

            // then
            assertThat(response.eventId()).isEqualTo(event.getId());
            assertThat(response.sessionId()).isEqualTo(session.getId());
            assertThat(response.userId()).isEqualTo(user.getId());
            assertThat(response.currencyCode()).isEqualTo("KRW");
            assertThat(response.totalTicketPriceAmount()).isEqualByComparingTo("300000");
            assertThat(response.seats()).hasSize(2);
            assertThat(response.seats().getFirst().priceInfos()).hasSize(2);
            assertThat(response.seats().getFirst().priceInfos().getFirst().discountName()).isEqualTo("조기예매");
        }

        @Test
        @DisplayName("hold 좌석과 요청 좌석이 다르면 예외가 발생한다")
        void getBookingOptions_invalidHoldSeats() {
            // given
            SessionSeat seat = createAvailableSeat("A", "1");

            // when & then
            assertThatThrownBy(() -> bookingOptionService.getBookingOptions(
                    user.getId(),
                    new BookingOptionsRequest(
                            event.getId(),
                            session.getId(),
                            List.of(seat.getId())
                    )
            )).isInstanceOf(BaseException.class);
        }
    }

    private void holdSeats(Long... seatIds) {
        seatService.holdSeats(
                event.getId(),
                session.getId(),
                user.getId(),
                new SeatHoldRequest(List.of(seatIds))
        );
    }

    private SessionSeat createAvailableSeat(String rowLabel, String number) {
        EventSection section = eventSectionRepository.save(createSection(event, "A구역", 1));
        EventSeat eventSeat = eventSeatRepository.save(createEventSeat(section, rowLabel, number));
        return sessionSeatRepository.save(
                createSessionSeat(session, eventSeat, section.getId(), SessionSeat.SaleStatus.AVAILABLE)
        );
    }

    private User createUser() {
        return User.builder()
                .id(1001L)
                .userNo("USER-BOOKING-0001")
                .email("booking-option@test.com")
                .phoneNumber("010-1111-2222")
                .name("권종선택유저")
                .nickname("bookingOptionUser")
                .birthDate(LocalDate.of(1998, 1, 1))
                .role(UserRole.USER)
                .status(User.Status.ACTIVE)
                .build();
    }

    private Organizer createOrganizer() {
        Organizer o = Organizer.builder()
                .organizerName("테스트 주최사")
                .businessNo("123-45-67890")
                .contactEmail("test@tickle.com")
                .contactPhone("010-1234-5678")
                .status(Organizer.Status.ACTIVE)
                .build();
        setAuditFields(o);
        return o;
    }

    private Venue createVenue() {
        Venue v = Venue.builder()
                .venueName("테스트 공연장")
                .timezoneCode("Asia/Seoul")
                .countryCode("KR")
                .address("서울시 강남구")
                .cityName("서울")
                .capacity(5000)
                .build();
        setAuditFields(v);
        return v;
    }

    private Category createCategory() {
        Category c = Category.builder()
                .categoryName("콘서트")
                .build();
        setAuditFields(c);
        return c;
    }

    private Event createEvent() {
        Instant now = Instant.now();
        Event e = Event.builder()
                .organizer(organizer)
                .venue(venue)
                .category(category)
                .title("권종선택 테스트 공연")
                .salesStartAt(now.minusSeconds(86_400))
                .salesEndAt(now.plusSeconds(86_400))
                .eventStartAt(now.plusSeconds(172_800))
                .eventEndAt(now.plusSeconds(180_000))
                .metadata(new Event.EventMetadata(List.of("테스트")))
                .notice("공지사항")
                .status(Event.Status.OPENED)
                .build();
        setAuditFields(e);
        return e;
    }

    private EventSession createSession(Event e) {
        Instant now = Instant.now();
        EventSession s = EventSession.builder()
                .event(e)
                .sessionNo(1)
                .startAt(now.plusSeconds(172_800))
                .endAt(now.plusSeconds(180_000))
                .salesOpenAt(now.minusSeconds(86_400))
                .salesCloseAt(now.plusSeconds(86_400))
                .status(EventSession.Status.OPENED)
                .build();
        setAuditFields(s);
        return s;
    }

    private EventPricePolicy createPricePolicy(Event e) {
        EventPricePolicy pp = EventPricePolicy.builder()
                .event(e)
                .priceGrade(SeatGrade.R)
                .priceAmount(new BigDecimal("150000"))
                .discountInfo(List.of(
                        new EventPricePolicy.DiscountInfo("조기예매", new BigDecimal("10.0"), new BigDecimal("135000")),
                        new EventPricePolicy.DiscountInfo("일반예매", BigDecimal.ZERO, new BigDecimal("150000"))
                ))
                .currencyCode("KRW")
                .displayOrder(1)
                .build();
        setAuditFields(pp);
        return pp;
    }

    private EventSection createSection(Event e, String name, int displayOrder) {
        EventSection sec = EventSection.builder()
                .event(e)
                .venueId(venue.getId())
                .sectionName(name)
                .displayOrder(displayOrder)
                .build();
        setAuditFields(sec);
        return sec;
    }

    private EventSeat createEventSeat(EventSection section, String rowLabel, String number) {
        EventSeat es = EventSeat.builder()
                .eventSection(section)
                .eventPricePolicy(pricePolicy)
                .venueId(venue.getId())
                .rowLabel(rowLabel)
                .seatNumber(number)
                .seatLabel(rowLabel + "-" + number)
                .seatGrade(SeatGrade.R)
                .build();
        setAuditFields(es);
        return es;
    }

    private SessionSeat createSessionSeat(
            EventSession sess,
            EventSeat eventSeat,
            Long eventSectionId,
            SessionSeat.SaleStatus status
    ) {
        SessionSeat ss = SessionSeat.builder()
                .session(sess)
                .eventSeat(eventSeat)
                .eventSectionId(eventSectionId)
                .saleStatus(status)
                .versionNo(0L)
                .build();
        ReflectionTestUtils.setField(ss, "updatedAt", Instant.now());
        return ss;
    }

    private void setAuditFields(Object target) {
        Instant now = Instant.now();
        try {
            ReflectionTestUtils.setField(target, "createdAt", now);
        } catch (IllegalArgumentException ignored) {
        }
        ReflectionTestUtils.setField(target, "updatedAt", now);
    }
}
