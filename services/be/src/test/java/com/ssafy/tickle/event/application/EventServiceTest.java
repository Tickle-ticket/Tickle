package com.ssafy.tickle.event.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.common.domain.SeatGrade;
import com.ssafy.tickle.category.domain.Category;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventImage;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.organizer.domain.Organizer;
import com.ssafy.tickle.category.infrastructure.persistence.CategoryRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventImageRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventPricePolicyRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.organizer.infrastructure.persistence.OrganizerRepository;
import com.ssafy.tickle.event.presentation.dto.CategoryRankingResponse;
import com.ssafy.tickle.event.presentation.dto.EventDetailResponse;
import com.ssafy.tickle.event.presentation.dto.EventListResponse;
import com.ssafy.tickle.event.presentation.dto.EventRankingResponse;
import com.ssafy.tickle.event.presentation.dto.OpeningSoonEventResponse;
import com.ssafy.tickle.event.presentation.dto.OpeningSoonEventsResponse;
import com.ssafy.tickle.venue.domain.Venue;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 이벤트 조회 서비스 통합 테스트입니다.
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("EventService 통합 테스트")
class EventServiceTest {

    @Autowired
    private EventService eventService;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventImageRepository eventImageRepository;

    @Autowired
    private EventSessionRepository eventSessionRepository;

    @Autowired
    private EventPricePolicyRepository eventPricePolicyRepository;

    @Autowired
    private OrganizerRepository organizerRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    private Organizer organizer;
    private Venue venue;
    private Category concertCategory;
    private Category musicalCategory;

    @BeforeEach
    void setUp() {
        clearRankingCache();
        organizer = organizerRepository.save(createOrganizer("테스트 주최자"));
        venue = venueRepository.save(createVenue("테스트 공연장"));
        concertCategory = categoryRepository.save(createCategory("콘서트"));
        musicalCategory = categoryRepository.save(createCategory("뮤지컬"));
    }

    @AfterEach
    void tearDown() {
        clearRankingCache();
        eventImageRepository.deleteAllInBatch();
        eventSessionRepository.deleteAllInBatch();
        eventPricePolicyRepository.deleteAllInBatch();
        eventRepository.deleteAllInBatch();
        categoryRepository.deleteAllInBatch();
        venueRepository.deleteAllInBatch();
        organizerRepository.deleteAllInBatch();
    }

    private void clearRankingCache() {
        Set<String> keys = stringRedisTemplate.keys("event:ranking:*");
        if (keys != null && !keys.isEmpty()) {
            stringRedisTemplate.delete(keys);
        }

        stringRedisTemplate.delete("event:opening-soon");
    }

    @Nested
    @DisplayName("상세 조회")
    class GetEventDetailTest {

        private Event savedEvent;
        private List<EventImage> savedImages;
        private List<EventSession> savedSessions;
        private List<EventPricePolicy> savedPricePolicies;

        @BeforeEach
        void setUp() {
            savedEvent = eventRepository.save(createEvent(
                    "Seoul Jazz Festival",
                    concertCategory,
                    Instant.parse("2026-05-01T10:00:00Z")
            ));
            savedImages = eventImageRepository.saveAll(List.of(
                    createImage(savedEvent, EventImage.ImageType.POSTER, "https://cdn.test/poster.jpg", 0),
                    createImage(savedEvent, EventImage.ImageType.DETAIL, "https://cdn.test/detail.jpg", 1)
            ));
            savedSessions = eventSessionRepository.saveAll(List.of(
                    createSession(savedEvent, 1, Instant.parse("2026-05-01T10:00:00Z")),
                    createSession(savedEvent, 2, Instant.parse("2026-05-02T10:00:00Z"))
            ));
            savedPricePolicies = eventPricePolicyRepository.saveAll(List.of(
                    createPricePolicy(savedEvent, SeatGrade.VIP, "220000", 0),
                    createPricePolicy(savedEvent, SeatGrade.R, "150000", 1)
            ));
        }

        @Test
        @DisplayName("등록된 이벤트를 조회하면 이미지, 회차, 가격 정책을 포함한 상세 정보를 반환한다")
        void getEventDetail_success() {
            EventDetailResponse response = eventService.getEventDetail(savedEvent.getId());

            assertThat(response.eventId()).isEqualTo(savedEvent.getId());
            assertThat(response.title()).isEqualTo("Seoul Jazz Festival");
            assertThat(response.categoryName()).isEqualTo("콘서트");
            assertThat(response.organizerName()).isEqualTo("테스트 주최자");
            assertThat(response.venueName()).isEqualTo("테스트 공연장");
            assertThat(response.images())
                    .extracting(image -> image.eventImageId())
                    .containsExactly(savedImages.get(0).getId(), savedImages.get(1).getId());
            assertThat(response.sessions())
                    .extracting(session -> session.sessionId())
                    .containsExactly(savedSessions.get(0).getId(), savedSessions.get(1).getId());
            assertThat(response.pricePolicies())
                    .extracting(policy -> policy.eventPricePolicyId())
                    .containsExactly(savedPricePolicies.get(0).getId(), savedPricePolicies.get(1).getId());
        }

        @Test
        @DisplayName("존재하지 않는 이벤트를 조회하면 RESOURCE_NOT_FOUND 예외가 발생한다")
        void getEventDetail_notFound() {
            assertThatThrownBy(() -> eventService.getEventDetail(Long.MAX_VALUE))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.RESOURCE_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("검색 조회")
    class GetEventsTest {

        @BeforeEach
        void setUp() {
            Event firstEvent = eventRepository.save(createEvent(
                    "Rock Festival",
                    concertCategory,
                    Instant.parse("2026-06-01T10:00:00Z")
            ));
            Event secondEvent = eventRepository.save(createEvent(
                    "Rock Ballad Night",
                    concertCategory,
                    Instant.parse("2026-06-03T10:00:00Z")
            ));
            Event koreanEvent = eventRepository.save(createEvent(
                    "한국어 공연",
                    concertCategory,
                    Instant.parse("2026-06-04T10:00:00Z")
            ));
            Event ignoredEvent = eventRepository.save(createEvent(
                    "Spring Musical Gala",
                    musicalCategory,
                    Instant.parse("2026-06-05T10:00:00Z")
            ));

            eventImageRepository.saveAll(List.of(
                    createImage(firstEvent, EventImage.ImageType.THUMBNAIL, "https://cdn.test/rock-1-primary.jpg", 0),
                    createImage(firstEvent, EventImage.ImageType.THUMBNAIL, "https://cdn.test/rock-1-secondary.jpg", 1),
                    createImage(secondEvent, EventImage.ImageType.THUMBNAIL, "https://cdn.test/rock-2-primary.jpg", 0),
                    createImage(koreanEvent, EventImage.ImageType.THUMBNAIL, "https://cdn.test/korean-primary.jpg", 0),
                    createImage(ignoredEvent, EventImage.ImageType.THUMBNAIL, "https://cdn.test/musical-primary.jpg", 0)
            ));
        }

        @Test
        @DisplayName("키워드와 카테고리로 이벤트를 검색하면 정렬된 목록과 대표 썸네일을 반환한다")
        void getEvents_success() {
            EventListResponse response = eventService.getEvents("  rock  ", concertCategory.getId(), 0, 20);

            assertThat(response.items()).hasSize(2);
            assertThat(response.items())
                    .extracting(item -> item.title())
                    .containsExactly("Rock Festival", "Rock Ballad Night");
            assertThat(response.items())
                    .extracting(item -> item.thumbnailUrl())
                    .containsExactly(
                            "https://cdn.test/rock-1-primary.jpg",
                            "https://cdn.test/rock-2-primary.jpg"
                    );
            assertThat(response.totalElements()).isEqualTo(2);
            assertThat(response.hasNext()).isFalse();
        }

        @Test
        @DisplayName("한국어 키워드로 검색하면 한국어 제목 이벤트를 조회한다")
        void getEvents_koreanKeyword_success() {
            EventListResponse response = eventService.getEvents("한국어", null, 0, 20);

            assertThat(response.items()).hasSize(1);
            assertThat(response.items())
                    .extracting(item -> item.title())
                    .containsExactly("한국어 공연");
            assertThat(response.items())
                    .extracting(item -> item.thumbnailUrl())
                    .containsExactly("https://cdn.test/korean-primary.jpg");
        }

        @Test
        @DisplayName("공백만 있는 키워드로 검색하면 검색어 조건 없이 전체 이벤트를 조회한다")
        void getEvents_blankKeyword_searchesWithoutKeyword() {
            EventListResponse response = eventService.getEvents("   ", null, 0, 20);

            assertThat(response.items()).hasSize(4);
            assertThat(response.items())
                    .extracting(item -> item.title())
                    .containsExactly("Rock Festival", "Rock Ballad Night", "한국어 공연", "Spring Musical Gala");
        }
    }

    @Nested
    @DisplayName("랭킹 조회")
    class GetRankingTest {

        @Test
        @DisplayName("categoryId가 있으면 해당 카테고리의 상위 5개를 반환한다")
        void getRanking_withCategory_success() {
            Event first = saveEventWithCreatedAt("Concert 1", concertCategory, Instant.parse("2026-07-01T10:00:00Z"), List.of("A"), Instant.parse("2026-07-01T00:00:00Z"));
            Event second = saveEventWithCreatedAt("Concert 2", concertCategory, Instant.parse("2026-07-02T10:00:00Z"), List.of("B"), Instant.parse("2026-07-02T00:00:00Z"));
            Event third = saveEventWithCreatedAt("Concert 3", concertCategory, Instant.parse("2026-07-03T10:00:00Z"), List.of("C"), Instant.parse("2026-07-03T00:00:00Z"));
            Event fourth = saveEventWithCreatedAt("Concert 4", concertCategory, Instant.parse("2026-07-04T10:00:00Z"), List.of("D"), Instant.parse("2026-07-04T00:00:00Z"));
            Event fifth = saveEventWithCreatedAt("Concert 5", concertCategory, Instant.parse("2026-07-05T10:00:00Z"), List.of("E"), Instant.parse("2026-07-05T00:00:00Z"));
            saveEventWithCreatedAt("Concert 6", concertCategory, Instant.parse("2026-07-06T10:00:00Z"), List.of("F"), Instant.parse("2026-07-06T00:00:00Z"));

            eventImageRepository.saveAll(List.of(
                    createImage(first, EventImage.ImageType.THUMBNAIL, "https://cdn.test/c1.jpg", 0),
                    createImage(second, EventImage.ImageType.THUMBNAIL, "https://cdn.test/c2.jpg", 0),
                    createImage(third, EventImage.ImageType.THUMBNAIL, "https://cdn.test/c3.jpg", 0),
                    createImage(fourth, EventImage.ImageType.THUMBNAIL, "https://cdn.test/c4.jpg", 0),
                    createImage(fifth, EventImage.ImageType.THUMBNAIL, "https://cdn.test/c5.jpg", 0)
            ));

            CategoryRankingResponse response = eventService.getRanking(concertCategory.getId());

            assertThat(response.categoryId()).isEqualTo(concertCategory.getId());
            assertThat(response.categoryName()).isEqualTo("콘서트");
            assertThat(response.rankings()).hasSize(5);
            assertThat(response.rankings())
                    .extracting(EventRankingResponse::eventName)
                    .containsExactly("Concert 6", "Concert 5", "Concert 4", "Concert 3", "Concert 2");
            assertThat(response.rankings().get(0).tags()).containsExactly("F");
        }

        @Test
        @DisplayName("categoryId가 없으면 ALL 래퍼로 전체 상위 5개를 반환한다")
        void getRanking_all_success() {
            Event first = saveEventWithCreatedAt("Concert A", concertCategory, Instant.parse("2026-07-01T10:00:00Z"), List.of("A"), Instant.parse("2026-07-01T00:00:00Z"));
            Event second = saveEventWithCreatedAt("Musical B", musicalCategory, Instant.parse("2026-07-02T10:00:00Z"), List.of("B"), Instant.parse("2026-07-02T00:00:00Z"));
            Event third = saveEventWithCreatedAt("Concert C", concertCategory, Instant.parse("2026-07-03T10:00:00Z"), List.of("C"), Instant.parse("2026-07-03T00:00:00Z"));
            Event fourth = saveEventWithCreatedAt("Musical D", musicalCategory, Instant.parse("2026-07-04T10:00:00Z"), List.of("D"), Instant.parse("2026-07-04T00:00:00Z"));
            Event fifth = saveEventWithCreatedAt("Concert E", concertCategory, Instant.parse("2026-07-05T10:00:00Z"), List.of("E"), Instant.parse("2026-07-05T00:00:00Z"));
            saveEventWithCreatedAt("Musical F", musicalCategory, Instant.parse("2026-07-06T10:00:00Z"), List.of("F"), Instant.parse("2026-07-06T00:00:00Z"));

            eventImageRepository.saveAll(List.of(
                    createImage(first, EventImage.ImageType.THUMBNAIL, "https://cdn.test/a.jpg", 0),
                    createImage(second, EventImage.ImageType.THUMBNAIL, "https://cdn.test/b.jpg", 0),
                    createImage(third, EventImage.ImageType.THUMBNAIL, "https://cdn.test/c.jpg", 0),
                    createImage(fourth, EventImage.ImageType.THUMBNAIL, "https://cdn.test/d.jpg", 0),
                    createImage(fifth, EventImage.ImageType.THUMBNAIL, "https://cdn.test/e.jpg", 0)
            ));

            CategoryRankingResponse response = eventService.getRanking(null);

            assertThat(response.categoryId()).isNull();
            assertThat(response.categoryName()).isEqualTo("ALL");
            assertThat(response.rankings()).hasSize(5);
            assertThat(response.rankings())
                    .extracting(EventRankingResponse::eventName)
                    .containsExactly("Musical F", "Concert E", "Musical D", "Concert C", "Musical B");
        }
    }

    @Nested
    @DisplayName("오픈 임박 공연 조회")
    class GetOpeningSoonEventsTest {

        @Test
        @DisplayName("기본 5개를 판매 시작 시각 오름차순으로 반환한다")
        void getOpeningSoonEvents_defaultSize_success() {
            Event first = saveOpeningSoonEvent(
                    "Opening Soon 1",
                    concertCategory,
                    Instant.parse("2026-04-24T01:00:00Z"),
                    Instant.parse("2026-05-01T10:00:00Z"),
                    List.of("A")
            );
            Event second = saveOpeningSoonEvent(
                    "Opening Soon 2",
                    concertCategory,
                    Instant.parse("2026-04-24T02:00:00Z"),
                    Instant.parse("2026-05-02T10:00:00Z"),
                    List.of("B")
            );
            Event third = saveOpeningSoonEvent(
                    "Opening Soon 3",
                    concertCategory,
                    Instant.parse("2026-04-24T03:00:00Z"),
                    Instant.parse("2026-05-03T10:00:00Z"),
                    List.of("C")
            );
            Event fourth = saveOpeningSoonEvent(
                    "Opening Soon 4",
                    concertCategory,
                    Instant.parse("2026-04-24T04:00:00Z"),
                    Instant.parse("2026-05-04T10:00:00Z"),
                    List.of("D")
            );
            Event fifth = saveOpeningSoonEvent(
                    "Opening Soon 5",
                    concertCategory,
                    Instant.parse("2026-04-24T05:00:00Z"),
                    Instant.parse("2026-05-05T10:00:00Z"),
                    List.of("E")
            );
            saveOpeningSoonEvent(
                    "Opening Soon 6",
                    concertCategory,
                    Instant.parse("2026-04-24T06:00:00Z"),
                    Instant.parse("2026-05-06T10:00:00Z"),
                    List.of("F")
            );
            saveOpeningSoonEvent(
                    "Past Pending",
                    concertCategory,
                    Instant.parse("2026-04-23T23:00:00Z"),
                    Instant.parse("2026-04-29T10:00:00Z"),
                    List.of("PAST")
            );

            eventImageRepository.saveAll(List.of(
                    createImage(first, EventImage.ImageType.THUMBNAIL, "https://cdn.test/os1.jpg", 0),
                    createImage(second, EventImage.ImageType.THUMBNAIL, "https://cdn.test/os2.jpg", 0),
                    createImage(third, EventImage.ImageType.THUMBNAIL, "https://cdn.test/os3.jpg", 0),
                    createImage(fourth, EventImage.ImageType.THUMBNAIL, "https://cdn.test/os4.jpg", 0),
                    createImage(fifth, EventImage.ImageType.THUMBNAIL, "https://cdn.test/os5.jpg", 0)
            ));

            OpeningSoonEventsResponse response = eventService.getOpeningSoonEvents();

            assertThat(response.events()).hasSize(5);
            assertThat(response.events())
                    .extracting(OpeningSoonEventResponse::eventName)
                    .containsExactly(
                            "Opening Soon 1",
                            "Opening Soon 2",
                            "Opening Soon 3",
                            "Opening Soon 4",
                            "Opening Soon 5"
                    );
            assertThat(response.events())
                    .extracting(OpeningSoonEventResponse::thumbnailUrl)
                    .containsExactly(
                            "https://cdn.test/os1.jpg",
                            "https://cdn.test/os2.jpg",
                            "https://cdn.test/os3.jpg",
                            "https://cdn.test/os4.jpg",
                            "https://cdn.test/os5.jpg"
                    );
            assertThat(response.events().get(0).tags()).containsExactly("A");
        }

        @Test
        @DisplayName("오픈 임박 공연은 캐시된 응답을 재사용한다")
        void getOpeningSoonEvents_usesCache() {
            Event first = saveOpeningSoonEvent(
                    "Opening Soon Cache 1",
                    concertCategory,
                    Instant.parse("2099-04-24T01:00:00Z"),
                    Instant.parse("2099-05-01T10:00:00Z"),
                    List.of("A")
            );

            eventImageRepository.save(createImage(first, EventImage.ImageType.THUMBNAIL, "https://cdn.test/cache-1.jpg", 0));

            OpeningSoonEventsResponse firstResponse = eventService.getOpeningSoonEvents();

            saveOpeningSoonEvent(
                    "Opening Soon Cache 2",
                    concertCategory,
                    Instant.parse("2099-04-24T02:00:00Z"),
                    Instant.parse("2099-05-02T10:00:00Z"),
                    List.of("B")
            );

            OpeningSoonEventsResponse secondResponse = eventService.getOpeningSoonEvents();

            assertThat(firstResponse.events())
                    .extracting(OpeningSoonEventResponse::eventName)
                    .containsExactly("Opening Soon Cache 1");
            assertThat(secondResponse.events())
                    .extracting(OpeningSoonEventResponse::eventName)
                    .containsExactly("Opening Soon Cache 1");
        }
    }

    private Organizer createOrganizer(String organizerName) {
        Organizer organizer = Organizer.builder()
                .organizerName(organizerName)
                .businessNo("123-45-67890")
                .contactEmail("organizer@test.com")
                .contactPhone("010-1234-5678")
                .status(Organizer.Status.ACTIVE)
                .build();

        setAuditFields(organizer);
        return organizer;
    }

    private Venue createVenue(String venueName) {
        Venue venue = Venue.builder()
                .venueName(venueName)
                .timezoneCode("Asia/Seoul")
                .countryCode("KR")
                .address("서울 송파구 올림픽로 25")
                .addressLine2("101호")
                .cityName("서울")
                .capacity(15_000)
                .build();

        setAuditFields(venue);
        return venue;
    }

    private Category createCategory(String categoryName) {
        Category category = Category.builder()
                .categoryName(categoryName)
                .build();

        setAuditFields(category);
        return category;
    }

    private Event createEvent(String title, Category category, Instant eventStartAt) {
        Event event = Event.builder()
                .organizer(organizer)
                .venue(venue)
                .title(title)
                .category(category)
                .salesStartAt(eventStartAt.minusSeconds(86_400))
                .salesEndAt(eventStartAt.plusSeconds(172_800))
                .eventStartAt(eventStartAt)
                .eventEndAt(eventStartAt.plusSeconds(7_200))
                .metadata(new Event.EventMetadata(List.of("new", "mysterious")))
                .notice("관람 전 신분증을 지참해주세요.")
                .status(Event.Status.OPENED)
                .build();

        setAuditFields(event);
        return event;
    }

    private EventImage createImage(Event event, EventImage.ImageType imageType, String imageUrl, int displayOrder) {
        EventImage image = EventImage.builder()
                .event(event)
                .imageType(imageType)
                .imageUrl(imageUrl)
                .displayOrder(displayOrder)
                .build();

        setAuditFields(image);
        return image;
    }

    private EventSession createSession(Event event, int sessionNo, Instant startAt) {
        EventSession session = EventSession.builder()
                .event(event)
                .sessionNo(sessionNo)
                .startAt(startAt)
                .endAt(startAt.plusSeconds(7_200))
                .salesOpenAt(startAt.minusSeconds(604_800))
                .salesCloseAt(startAt.minusSeconds(3_600))
                .status(EventSession.Status.OPENED)
                .build();

        setAuditFields(session);
        return session;
    }

    private EventPricePolicy createPricePolicy(Event event, SeatGrade priceGrade, String actualPriceAmount, int displayOrder) {
        EventPricePolicy pricePolicy = EventPricePolicy.builder()
                .event(event)
                .priceGrade(priceGrade)
                .priceAmount(new BigDecimal(actualPriceAmount))
                .discountInfo(List.of(
                        new EventPricePolicy.DiscountInfo(
                                "기본 할인",
                                BigDecimal.ZERO,
                                new BigDecimal(actualPriceAmount)
                        )
                ))
                .currencyCode("KRW")
                .displayOrder(displayOrder)
                .build();

        setAuditFields(pricePolicy);
        return pricePolicy;
    }

    private Event saveEventWithCreatedAt(
            String title,
            Category category,
            Instant eventStartAt,
            List<String> tags,
            Instant createdAt
    ) {
        Event saved = eventRepository.save(createEventWithTags(title, category, eventStartAt, tags));
        ReflectionTestUtils.setField(saved, "createdAt", createdAt);
        ReflectionTestUtils.setField(saved, "updatedAt", createdAt);
        return eventRepository.save(saved);
    }

    private Event saveOpeningSoonEvent(
            String title,
            Category category,
            Instant salesStartAt,
            Instant eventStartAt,
            List<String> tags
    ) {
        return saveOpeningSoonEvent(title, category, salesStartAt, eventStartAt, tags, Event.Status.PENDING);
    }

    private Event saveOpeningSoonEvent(
            String title,
            Category category,
            Instant salesStartAt,
            Instant eventStartAt,
            List<String> tags,
            Event.Status status
    ) {
        Event saved = eventRepository.save(createEventWithStatus(title, category, salesStartAt, eventStartAt, tags, status));
        ReflectionTestUtils.setField(saved, "updatedAt", salesStartAt.minusSeconds(60));
        return eventRepository.save(saved);
    }

    private Event createEventWithTags(String title, Category category, Instant eventStartAt, List<String> tags) {
        return createEventWithStatus(
                title,
                category,
                eventStartAt.minusSeconds(86_400),
                eventStartAt,
                tags,
                Event.Status.OPENED
        );
    }

    private Event createEventWithStatus(
            String title,
            Category category,
            Instant salesStartAt,
            Instant eventStartAt,
            List<String> tags,
            Event.Status status
    ) {
        Event event = Event.builder()
                .organizer(organizer)
                .venue(venue)
                .title(title)
                .category(category)
                .salesStartAt(salesStartAt)
                .salesEndAt(eventStartAt.plusSeconds(172_800))
                .eventStartAt(eventStartAt)
                .eventEndAt(eventStartAt.plusSeconds(7_200))
                .metadata(new Event.EventMetadata(tags))
                .notice("관람 전 신분증을 지참해주세요.")
                .status(status)
                .build();

        setAuditFields(event);
        return event;
    }

    private void setAuditFields(Object target) {
        Instant now = Instant.parse("2026-04-21T00:00:00Z");
        ReflectionTestUtils.setField(target, "createdAt", now);
        ReflectionTestUtils.setField(target, "updatedAt", now);
    }
}
