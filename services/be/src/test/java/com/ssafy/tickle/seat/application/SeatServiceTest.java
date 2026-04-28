package com.ssafy.tickle.seat.application;

import com.ssafy.tickle.common.exception.BaseException;
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
import com.ssafy.tickle.seat.domain.EventSeat;
import com.ssafy.tickle.seat.domain.EventSection;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSeatRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSectionRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.seat.presentation.dto.SeatMapResponse;
import com.ssafy.tickle.seat.presentation.dto.SeatSectionResponse;
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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * SeatService 통합 테스트입니다.
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("SeatService 통합 테스트")
class SeatServiceTest {

    @Autowired private SeatService seatService;

    @Autowired private EventRepository eventRepository;
    @Autowired private EventSessionRepository eventSessionRepository;
    @Autowired private OrganizerRepository organizerRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private VenueRepository venueRepository;
    @Autowired private EventPricePolicyRepository eventPricePolicyRepository;
    @Autowired private EventSectionRepository eventSectionRepository;
    @Autowired private EventSeatRepository eventSeatRepository;
    @Autowired private SessionSeatRepository sessionSeatRepository;

    private Organizer organizer;
    private Venue venue;
    private Category category;
    private Event event;
    private EventSession session;
    private EventPricePolicy pricePolicy;

    @BeforeEach
    void setUp() {
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
    }

    // ───────────────────── getSeatMap ─────────────────────

    @Nested
    @DisplayName("좌석 배치도 조회")
    class GetSeatMap {

        @Test
        @DisplayName("구역과 좌석이 정상 반환된다")
        void getSeatMap_success() {
            // given
            EventSection sectionA = eventSectionRepository.save(createSection(event, "A구역", 1));
            EventSection sectionB = eventSectionRepository.save(createSection(event, "B구역", 2));

            EventSeat seat1 = eventSeatRepository.save(createEventSeat(sectionA, pricePolicy, "1", "1", "A-1-1"));
            EventSeat seat2 = eventSeatRepository.save(createEventSeat(sectionA, pricePolicy, "1", "2", "A-1-2"));
            EventSeat seat3 = eventSeatRepository.save(createEventSeat(sectionB, pricePolicy, "1", "1", "B-1-1"));

            sessionSeatRepository.save(createSessionSeat(session, seat1, sectionA.getId(), SessionSeat.SaleStatus.AVAILABLE));
            sessionSeatRepository.save(createSessionSeat(session, seat2, sectionA.getId(), SessionSeat.SaleStatus.HELD));
            sessionSeatRepository.save(createSessionSeat(session, seat3, sectionB.getId(), SessionSeat.SaleStatus.CONFIRMED));

            // when
            SeatMapResponse response = seatService.getSeatMap(event.getId(), session.getId());

            // then
            assertThat(response.sections()).hasSize(2);

            SeatSectionResponse firstSection = response.sections().get(0);
            assertThat(firstSection.sectionName()).isEqualTo("A구역");
            assertThat(firstSection.displayOrder()).isEqualTo(1);
            assertThat(firstSection.seats()).hasSize(2);
            assertThat(firstSection.seats().get(0).saleStatus()).isEqualTo(SessionSeat.SaleStatus.AVAILABLE);
            assertThat(firstSection.seats().get(1).saleStatus()).isEqualTo(SessionSeat.SaleStatus.HELD);

            SeatSectionResponse secondSection = response.sections().get(1);
            assertThat(secondSection.sectionName()).isEqualTo("B구역");
            assertThat(secondSection.seats()).hasSize(1);
            assertThat(secondSection.seats().get(0).saleStatus()).isEqualTo(SessionSeat.SaleStatus.CONFIRMED);
        }

        @Test
        @DisplayName("좌석이 없는 회차는 빈 구역 목록을 반환한다")
        void getSeatMap_emptySeats() {
            // when
            SeatMapResponse response = seatService.getSeatMap(event.getId(), session.getId());

            // then
            assertThat(response.sections()).isEmpty();
        }

        @Test
        @DisplayName("존재하지 않는 공연 ID면 예외가 발생한다")
        void getSeatMap_eventNotFound() {
            assertThatThrownBy(() -> seatService.getSeatMap(9999L, session.getId()))
                    .isInstanceOf(BaseException.class)
                    .hasMessageContaining("공연을 찾을 수 없습니다.");
        }

        @Test
        @DisplayName("존재하지 않는 회차 ID면 예외가 발생한다")
        void getSeatMap_sessionNotFound() {
            assertThatThrownBy(() -> seatService.getSeatMap(event.getId(), 9999L))
                    .isInstanceOf(BaseException.class)
                    .hasMessageContaining("회차를 찾을 수 없습니다.");
        }

        @Test
        @DisplayName("다른 공연의 회차 ID를 요청하면 예외가 발생한다")
        void getSeatMap_sessionNotBelongToEvent() {
            // given
            Event anotherEvent = eventRepository.save(createEvent());
            EventSession anotherSession = eventSessionRepository.save(createSession(anotherEvent));

            assertThatThrownBy(() -> seatService.getSeatMap(event.getId(), anotherSession.getId()))
                    .isInstanceOf(BaseException.class)
                    .hasMessageContaining("해당 공연의 회차를 찾을 수 없습니다.");
        }

        @Test
        @DisplayName("좌석 응답에 가격과 좌석 라벨이 포함된다")
        void getSeatMap_includesPriceAndLabel() {
            // given
            EventSection section = eventSectionRepository.save(createSection(event, "A구역", 1));
            EventSeat seat = eventSeatRepository.save(createEventSeat(section, pricePolicy, "1", "1", "A-1-1"));
            sessionSeatRepository.save(createSessionSeat(session, seat, section.getId(), SessionSeat.SaleStatus.AVAILABLE));

            // when
            SeatMapResponse response = seatService.getSeatMap(event.getId(), session.getId());

            // then
            var seatItem = response.sections().get(0).seats().get(0);
            assertThat(seatItem.seatLabel()).isEqualTo("A-1-1");
            assertThat(seatItem.rowLabel()).isEqualTo("1");
            assertThat(seatItem.seatNumber()).isEqualTo("1");
            assertThat(seatItem.price()).isEqualByComparingTo(new BigDecimal("150000"));
        }
    }

    // ───────────────────── helper methods ─────────────────────

    private Organizer createOrganizer() {
        Organizer org = Organizer.builder()
                .organizerName("테스트 주최사")
                .businessNo("123-45-67890")
                .contactEmail("test@tickle.com")
                .contactPhone("010-1234-5678")
                .status(Organizer.Status.ACTIVE)
                .build();
        setAuditFields(org);
        return org;
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
        Category cat = Category.builder()
                .categoryName("콘서트")
                .build();
        setAuditFields(cat);
        return cat;
    }

    private Event createEvent() {
        Instant now = Instant.now();
        Event e = Event.builder()
                .organizer(organizer)
                .venue(venue)
                .title("테스트 공연")
                .category(category)
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

    private EventSession createSession(Event event) {
        Instant now = Instant.now();
        EventSession s = EventSession.builder()
                .event(event)
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

    private EventPricePolicy createPricePolicy(Event event) {
        EventPricePolicy pp = EventPricePolicy.builder()
                .event(event)
                .priceGrade("R석")
                .audienceType("일반")
                .salePriceAmount(new BigDecimal("150000"))
                .currencyCode("KRW")
                .displayOrder(1)
                .build();
        setAuditFields(pp);
        return pp;
    }

    private EventSection createSection(Event event, String sectionName, int displayOrder) {
        EventSection sec = EventSection.builder()
                .event(event)
                .venueId(venue.getId())
                .sectionName(sectionName)
                .displayOrder(displayOrder)
                .build();
        setAuditFields(sec);
        return sec;
    }

    private EventSeat createEventSeat(EventSection section, EventPricePolicy pricePolicy, String row, String number, String label) {
        EventSeat es = EventSeat.builder()
                .eventSection(section)
                .eventPricePolicy(pricePolicy)
                .venueId(venue.getId())
                .rowLabel(row)
                .seatNumber(number)
                .seatLabel(label)
                .seatType(EventSeat.SeatType.REGULAR)
                .build();
        setAuditFields(es);
        return es;
    }

    private SessionSeat createSessionSeat(EventSession session, EventSeat eventSeat, Long eventSectionId, SessionSeat.SaleStatus status) {
        SessionSeat ss = SessionSeat.builder()
                .session(session)
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
            // createdAt 필드가 없는 경우 무시 (SessionSeat 등)
        }
        ReflectionTestUtils.setField(target, "updatedAt", now);
    }
}
