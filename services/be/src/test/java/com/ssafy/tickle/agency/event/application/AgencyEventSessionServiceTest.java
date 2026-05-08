package com.ssafy.tickle.agency.event.application;

import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventSessionRequest;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventSessionsRequest;
import com.ssafy.tickle.category.domain.Category;
import com.ssafy.tickle.category.infrastructure.persistence.CategoryRepository;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.organizer.domain.Organizer;
import com.ssafy.tickle.organizer.infrastructure.persistence.OrganizerRepository;
import com.ssafy.tickle.venue.domain.Venue;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("AgencyEventSessionService 통합 테스트")
class AgencyEventSessionServiceTest {

    @Autowired
    private AgencyEventSessionService agencyEventSessionService;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventSessionRepository eventSessionRepository;

    @Autowired
    private OrganizerRepository organizerRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private Organizer organizer;
    private Venue venue;
    private Category category;

    @BeforeEach
    void setUp() {
        organizer = organizerRepository.save(createOrganizer("테스트 기획사"));
        venue = venueRepository.save(createVenue("테스트 공연장"));
        category = categoryRepository.save(createCategory("콘서트"));
    }

    @AfterEach
    void tearDown() {
        eventSessionRepository.deleteAllInBatch();
        eventRepository.deleteAllInBatch();
        venueRepository.deleteAllInBatch();
        categoryRepository.deleteAllInBatch();
        organizerRepository.deleteAllInBatch();
    }

    @Test
    @DisplayName("회차 목록은 시작 시각 순으로 번호가 자동 부여된다")
    void createSessions_success() {
        Event event = eventRepository.save(createEvent("회차 공연"));

        AgencyCreateEventSessionsRequest request = new AgencyCreateEventSessionsRequest(List.of(
                new AgencyCreateEventSessionRequest(
                        Instant.parse("2026-07-02T10:00:00Z"),
                        Instant.parse("2026-07-02T12:00:00Z"),
                        Instant.parse("2026-06-25T10:00:00Z"),
                        Instant.parse("2026-07-02T09:00:00Z")
                ),
                new AgencyCreateEventSessionRequest(
                        Instant.parse("2026-07-01T10:00:00Z"),
                        Instant.parse("2026-07-01T12:00:00Z"),
                        Instant.parse("2026-06-24T10:00:00Z"),
                        Instant.parse("2026-07-01T09:00:00Z")
                ),
                new AgencyCreateEventSessionRequest(
                        Instant.parse("2026-07-03T10:00:00Z"),
                        Instant.parse("2026-07-03T12:00:00Z"),
                        Instant.parse("2026-06-26T10:00:00Z"),
                        Instant.parse("2026-07-03T09:00:00Z")
                )
        ));

        List<EventSession> sessions = agencyEventSessionService.createSessions(event.getId(), request);

        assertThat(sessions).hasSize(3);
        assertThat(sessions)
                .extracting(EventSession::getSessionNo)
                .containsExactly(1, 2, 3);
        assertThat(sessions)
                .extracting(EventSession::getStartAt)
                .containsExactly(
                        Instant.parse("2026-07-01T10:00:00Z"),
                        Instant.parse("2026-07-02T10:00:00Z"),
                        Instant.parse("2026-07-03T10:00:00Z")
                );
        assertThat(eventSessionRepository.findByEventIdOrderByStartAtAsc(event.getId()))
                .extracting(EventSession::getSessionNo)
                .containsExactly(1, 2, 3);

        Event savedEvent = eventRepository.findById(event.getId()).orElseThrow();
        assertThat(savedEvent.getSalesStartAt()).isEqualTo(Instant.parse("2026-06-24T10:00:00Z"));
        assertThat(savedEvent.getSalesEndAt()).isEqualTo(Instant.parse("2026-07-03T09:00:00Z"));
    }

    @Test
    @DisplayName("회차를 여러 번 등록해도 판매 기간은 전체 회차 기준으로 갱신된다")
    void createSessions_updatesEventSalesPeriodFromAllSessions() {
        Event event = eventRepository.save(createEvent("다회 등록 공연"));

        agencyEventSessionService.createSessions(
                event.getId(),
                new AgencyCreateEventSessionsRequest(List.of(
                        new AgencyCreateEventSessionRequest(
                                Instant.parse("2026-07-02T10:00:00Z"),
                                Instant.parse("2026-07-02T12:00:00Z"),
                                Instant.parse("2026-06-25T10:00:00Z"),
                                Instant.parse("2026-07-02T09:00:00Z")
                        )
                ))
        );

        agencyEventSessionService.createSessions(
                event.getId(),
                new AgencyCreateEventSessionsRequest(List.of(
                        new AgencyCreateEventSessionRequest(
                                Instant.parse("2026-07-05T10:00:00Z"),
                                Instant.parse("2026-07-05T12:00:00Z"),
                                Instant.parse("2026-06-20T10:00:00Z"),
                                Instant.parse("2026-07-05T09:00:00Z")
                        )
                ))
        );

        Event savedEvent = eventRepository.findById(event.getId()).orElseThrow();
        assertThat(savedEvent.getSalesStartAt()).isEqualTo(Instant.parse("2026-06-20T10:00:00Z"));
        assertThat(savedEvent.getSalesEndAt()).isEqualTo(Instant.parse("2026-07-05T09:00:00Z"));
    }

    @Test
    @DisplayName("회차 시작 시각이 종료 시각보다 늦으면 예외가 발생한다")
    void createSessions_invalidSessionTimeline() {
        Event event = eventRepository.save(createEvent("잘못된 회차 공연"));

        AgencyCreateEventSessionsRequest request = new AgencyCreateEventSessionsRequest(List.of(
                new AgencyCreateEventSessionRequest(
                        Instant.parse("2026-07-01T12:00:00Z"),
                        Instant.parse("2026-07-01T10:00:00Z"),
                        Instant.parse("2026-06-24T10:00:00Z"),
                        Instant.parse("2026-07-01T09:00:00Z")
                )
        ));

        assertThatThrownBy(() -> agencyEventSessionService.createSessions(event.getId(), request))
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
}
