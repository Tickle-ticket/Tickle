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
import com.ssafy.tickle.seat.domain.SeatErrorCode;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSeatRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSectionRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.seat.infrastructure.redis.SeatHoldKeyStore;
import com.ssafy.tickle.seat.presentation.dto.SeatHoldRequest;
import com.ssafy.tickle.seat.presentation.dto.SeatHoldResponse;
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
    @Autowired private SeatHoldKeyStore seatHoldKeyStore;

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

    // ================================================================
    // 좌석 배치도 조회 테스트
    // ================================================================

    @Nested
    @DisplayName("좌석 배치도 조회")
    class GetSeatMap {

        @Test
        @DisplayName("구역과 좌석이 정상 반환된다")
        void getSeatMap_success() {
            // given
            EventSection sectionA = eventSectionRepository.save(createSection(event, "A구역", 1));
            EventSection sectionB = eventSectionRepository.save(createSection(event, "B구역", 2));

            EventSeat seatA1 = eventSeatRepository.save(createEventSeat(sectionA, pricePolicy, "A", "1"));
            EventSeat seatA2 = eventSeatRepository.save(createEventSeat(sectionA, pricePolicy, "A", "2"));
            EventSeat seatB1 = eventSeatRepository.save(createEventSeat(sectionB, pricePolicy, "B", "1"));

            sessionSeatRepository.save(createSessionSeat(session, seatA1, sectionA.getId(), SessionSeat.SaleStatus.AVAILABLE));
            sessionSeatRepository.save(createSessionSeat(session, seatA2, sectionA.getId(), SessionSeat.SaleStatus.HELD));
            sessionSeatRepository.save(createSessionSeat(session, seatB1, sectionB.getId(), SessionSeat.SaleStatus.CONFIRMED));

            // when
            SeatMapResponse response = seatService.getSeatMap(event.getId(), session.getId());

            // then
            assertThat(response.sections()).hasSize(2);
            SeatSectionResponse firstSection = response.sections().get(0);
            assertThat(firstSection.sectionName()).isEqualTo("A구역");
            assertThat(firstSection.seats()).hasSize(2);
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
                    .hasMessageContaining("속하는 회차");
        }

        @Test
        @DisplayName("존재하지 않는 회차 ID면 예외가 발생한다")
        void getSeatMap_sessionNotFound() {
            assertThatThrownBy(() -> seatService.getSeatMap(event.getId(), 9999L))
                    .isInstanceOf(BaseException.class)
                    .hasMessageContaining("속하는 회차");
        }

        @Test
        @DisplayName("다른 공연의 회차 ID를 요청하면 예외가 발생한다")
        void getSeatMap_sessionNotBelongToEvent() {
            // given
            Event anotherEvent = eventRepository.save(createEvent());
            EventSession anotherSession = eventSessionRepository.save(createSession(anotherEvent));

            assertThatThrownBy(() -> seatService.getSeatMap(event.getId(), anotherSession.getId()))
                    .isInstanceOf(BaseException.class)
                    .hasMessageContaining("속하는 회차");
        }

        @Test
        @DisplayName("좌석 응답에 가격과 좌석 라벨이 포함된다")
        void getSeatMap_containsPriceAndLabel() {
            // given
            EventSection section = eventSectionRepository.save(createSection(event, "S구역", 1));
            EventSeat seat = eventSeatRepository.save(createEventSeat(section, pricePolicy, "A", "1"));
            sessionSeatRepository.save(createSessionSeat(session, seat, section.getId(), SessionSeat.SaleStatus.AVAILABLE));

            // when
            SeatMapResponse response = seatService.getSeatMap(event.getId(), session.getId());

            // then
            assertThat(response.sections()).hasSize(1);
            var seatItem = response.sections().get(0).seats().get(0);
            assertThat(seatItem.price()).isNotNull();
            assertThat(seatItem.rowLabel()).isEqualTo("A");
            assertThat(seatItem.seatNumber()).isEqualTo("1");
        }
    }

    // ================================================================
    // 좌석 선점 테스트
    // ================================================================

    @Nested
    @DisplayName("좌석 선점")
    class HoldSeats {

        @Test
        @DisplayName("AVAILABLE 좌석을 정상 선점한다")
        void holdSeats_success() {
            // given
            EventSection section = eventSectionRepository.save(createSection(event, "A구역", 1));
            EventSeat seat1 = eventSeatRepository.save(createEventSeat(section, pricePolicy, "A", "1"));
            EventSeat seat2 = eventSeatRepository.save(createEventSeat(section, pricePolicy, "A", "2"));
            SessionSeat ss1 = sessionSeatRepository.save(createSessionSeat(session, seat1, section.getId(), SessionSeat.SaleStatus.AVAILABLE));
            SessionSeat ss2 = sessionSeatRepository.save(createSessionSeat(session, seat2, section.getId(), SessionSeat.SaleStatus.AVAILABLE));

            SeatHoldRequest request = new SeatHoldRequest(List.of(ss1.getId(), ss2.getId()));

            // when
            SeatHoldResponse response = seatService.holdSeats(event.getId(), session.getId(), 1L, request);

            // then
            assertThat(response.heldSessionSeatIds()).containsExactlyInAnyOrder(ss1.getId(), ss2.getId());
            assertThat(response.expiresAt()).isAfter(Instant.now());

            // DB 상태 및 heldByUserId 확인
            List<SessionSeat> updatedSeats = sessionSeatRepository.findAllByIdIn(List.of(ss1.getId(), ss2.getId()));
            assertThat(updatedSeats).allMatch(s -> s.getSaleStatus() == SessionSeat.SaleStatus.HELD);
            assertThat(updatedSeats).allMatch(s -> s.getHeldByUserId().equals(1L));

            // cleanup
            seatHoldKeyStore.deleteHeld(session.getId(), 1L);
        }

        @Test
        @DisplayName("선점 후 Redis에 TTL 키가 등록된다")
        void holdSeats_registersRedisKey() {
            // given
            EventSection section = eventSectionRepository.save(createSection(event, "A구역", 1));
            EventSeat seat = eventSeatRepository.save(createEventSeat(section, pricePolicy, "A", "1"));
            SessionSeat ss = sessionSeatRepository.save(createSessionSeat(session, seat, section.getId(), SessionSeat.SaleStatus.AVAILABLE));

            SeatHoldRequest request = new SeatHoldRequest(List.of(ss.getId()));
            Long userId = 42L;

            // when
            seatService.holdSeats(event.getId(), session.getId(), userId, request);

            // then
            List<Long> heldIds = seatHoldKeyStore.getHeldSeatIds(session.getId(), userId);
            assertThat(heldIds).containsExactly(ss.getId());

            // cleanup
            seatHoldKeyStore.deleteHeld(session.getId(), userId);
        }

        @Test
        @DisplayName("HELD 좌석이 포함되면 전체 선점이 실패한다")
        void holdSeats_alreadyHeld_fails() {
            // given
            EventSection section = eventSectionRepository.save(createSection(event, "A구역", 1));
            EventSeat seat1 = eventSeatRepository.save(createEventSeat(section, pricePolicy, "A", "1"));
            EventSeat seat2 = eventSeatRepository.save(createEventSeat(section, pricePolicy, "A", "2"));
            SessionSeat ss1 = sessionSeatRepository.save(createSessionSeat(session, seat1, section.getId(), SessionSeat.SaleStatus.AVAILABLE));
            SessionSeat ss2 = sessionSeatRepository.save(createSessionSeat(session, seat2, section.getId(), SessionSeat.SaleStatus.HELD)); // 이미 선점

            SeatHoldRequest request = new SeatHoldRequest(List.of(ss1.getId(), ss2.getId()));

            // when & then
            assertThatThrownBy(() -> seatService.holdSeats(event.getId(), session.getId(), 1L, request))
                    .isInstanceOf(BaseException.class)
                    .hasMessageContaining(SeatErrorCode.SEAT_ALREADY_HELD.getMessage());
        }

        @Test
        @DisplayName("존재하지 않는 좌석 ID 포함 시 예외가 발생한다")
        void holdSeats_seatNotFound() {
            // given
            SeatHoldRequest request = new SeatHoldRequest(List.of(9999L));

            // when & then
            assertThatThrownBy(() -> seatService.holdSeats(event.getId(), session.getId(), 1L, request))
                    .isInstanceOf(BaseException.class)
                    .hasMessageContaining(SeatErrorCode.SEAT_NOT_FOUND.getMessage());
        }

        @Test
        @DisplayName("단좌석 선점이 성공한다")
        void holdSeats_singleSeat_success() {
            // given
            EventSection section = eventSectionRepository.save(createSection(event, "A구역", 1));
            EventSeat seat = eventSeatRepository.save(createEventSeat(section, pricePolicy, "A", "1"));
            SessionSeat ss = sessionSeatRepository.save(createSessionSeat(session, seat, section.getId(), SessionSeat.SaleStatus.AVAILABLE));

            SeatHoldRequest request = new SeatHoldRequest(List.of(ss.getId()));

            // when
            SeatHoldResponse response = seatService.holdSeats(event.getId(), session.getId(), 1L, request);

            // then
            assertThat(response.heldSessionSeatIds()).containsExactly(ss.getId());
            SessionSeat updated = sessionSeatRepository.findById(ss.getId()).orElseThrow();
            assertThat(updated.getSaleStatus()).isEqualTo(SessionSeat.SaleStatus.HELD);

            // cleanup
            seatHoldKeyStore.deleteHeld(session.getId(), 1L);
        }
    }

    // ================================================================
    // 좌석 선점 해제 테스트
    // ================================================================

    @Nested
    @DisplayName("좌석 선점 해제")
    class ReleaseSeats {

        @Test
        @DisplayName("선점한 좌석을 정상 해제한다")
        void releaseSeats_success() {
            // given
            EventSection section = eventSectionRepository.save(createSection(event, "A구역", 1));
            EventSeat seat = eventSeatRepository.save(createEventSeat(section, pricePolicy, "A", "1"));
            Long userId = 1L;
            // heldByUserId 세팅 필수 — releaseSeats는 DB 기준으로 조회함
            SessionSeat ss = sessionSeatRepository.save(createHeldSessionSeat(session, seat, section.getId(), userId));
            seatHoldKeyStore.registerHeld(session.getId(), userId, List.of(ss.getId()));

            // when
            seatService.releaseSeats(event.getId(), session.getId(), userId);

            // then
            SessionSeat updated = sessionSeatRepository.findById(ss.getId()).orElseThrow();
            assertThat(updated.getSaleStatus()).isEqualTo(SessionSeat.SaleStatus.AVAILABLE);
            assertThat(updated.getHeldByUserId()).isNull();
            assertThat(seatHoldKeyStore.getHeldSeatIds(session.getId(), userId)).isEmpty();
        }

        @Test
        @DisplayName("Redis TTL 만료 후 수동 해제해도 정상 동작한다 (Redis 의존 제거 검증)")
        void releaseSeats_afterTtlExpiry_stillReleases() {
            // given - Redis 키 없이 DB에만 HELD 상태 (TTL 만료 시나리오 시뮬레이션)
            EventSection section = eventSectionRepository.save(createSection(event, "A구역", 1));
            EventSeat seat = eventSeatRepository.save(createEventSeat(section, pricePolicy, "A", "1"));
            Long userId = 77L;
            SessionSeat ss = sessionSeatRepository.save(createHeldSessionSeat(session, seat, section.getId(), userId));
            // Redis 키 등록하지 않음 (TTL 만료 상태 시뮬레이션)

            // when
            seatService.releaseSeats(event.getId(), session.getId(), userId);

            // then — Redis 키 없어도 DB 기준으로 정상 해제
            SessionSeat updated = sessionSeatRepository.findById(ss.getId()).orElseThrow();
            assertThat(updated.getSaleStatus()).isEqualTo(SessionSeat.SaleStatus.AVAILABLE);
            assertThat(updated.getHeldByUserId()).isNull();
        }

        @Test
        @DisplayName("선점이 없는 경우 멱등성을 보장하며 정상 반환한다")
        void releaseSeats_noHeld_idempotent() {
            // given - Redis에 키 없음
            Long userId = 1L;

            // when & then — 예외 없이 정상 종료
            seatService.releaseSeats(event.getId(), session.getId(), userId);
        }

        @Test
        @DisplayName("해제 후 Redis 키가 삭제된다")
        void releaseSeats_deletesRedisKey() {
            // given
            EventSection section = eventSectionRepository.save(createSection(event, "A구역", 1));
            EventSeat seat = eventSeatRepository.save(createEventSeat(section, pricePolicy, "A", "1"));
            Long userId = 99L;
            SessionSeat ss = sessionSeatRepository.save(createHeldSessionSeat(session, seat, section.getId(), userId));
            seatHoldKeyStore.registerHeld(session.getId(), userId, List.of(ss.getId()));

            // when
            seatService.releaseSeats(event.getId(), session.getId(), userId);

            // then
            assertThat(seatHoldKeyStore.getHeldSeatIds(session.getId(), userId)).isEmpty();
        }
    }

    // ================================================================
    // 테스트 헬퍼
    // ================================================================

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
                .title("테스트 공연")
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

    private EventPricePolicy createPricePolicy(Event e) {
        EventPricePolicy pp = EventPricePolicy.builder()
                .event(e)
                .priceGrade("R석")
                .audienceType("일반")
                .salePriceAmount(new BigDecimal("150000"))
                .currencyCode("KRW")
                .displayOrder(1)
                .build();
        setAuditFields(pp);
        return pp;
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

    private EventSeat createEventSeat(EventSection section, EventPricePolicy pp, String rowLabel, String number) {
        EventSeat es = EventSeat.builder()
                .eventSection(section)
                .eventPricePolicy(pp)
                .venueId(venue.getId())
                .rowLabel(rowLabel)
                .seatNumber(number)
                .seatLabel(rowLabel + number)
                .seatType(EventSeat.SeatType.REGULAR)
                .build();
        setAuditFields(es);
        return es;
    }

    private SessionSeat createSessionSeat(EventSession sess, EventSeat eventSeat, Long eventSectionId, SessionSeat.SaleStatus status) {
        return createHeldSessionSeat(sess, eventSeat, eventSectionId, null, status);
    }

    /**
     * HELD 상태와 heldByUserId가 세팅된 SessionSeat을 생성합니다.
     * releaseSeats()는 DB의 heldByUserId 기준으로 조회하므로 이 헬퍼를 사용해야 합니다.
     */
    private SessionSeat createHeldSessionSeat(EventSession sess, EventSeat eventSeat, Long eventSectionId, Long userId) {
        return createHeldSessionSeat(sess, eventSeat, eventSectionId, userId, SessionSeat.SaleStatus.HELD);
    }

    private SessionSeat createHeldSessionSeat(EventSession sess, EventSeat eventSeat, Long eventSectionId, Long userId, SessionSeat.SaleStatus status) {
        SessionSeat ss = SessionSeat.builder()
                .session(sess)
                .eventSeat(eventSeat)
                .eventSectionId(eventSectionId)
                .saleStatus(status)
                .versionNo(0L)
                .build();
        if (userId != null) {
            ReflectionTestUtils.setField(ss, "heldByUserId", userId);
        }
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
