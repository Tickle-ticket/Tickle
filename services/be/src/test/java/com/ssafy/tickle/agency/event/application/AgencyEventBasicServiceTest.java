package com.ssafy.tickle.agency.event.application;

import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventBasicRequest;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventPricePoliciesRequest;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventPricePolicyRequest;
import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyCreateEventResponse;
import com.ssafy.tickle.category.domain.Category;
import com.ssafy.tickle.category.infrastructure.persistence.CategoryRepository;
import com.ssafy.tickle.common.domain.SeatGrade;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.infrastructure.persistence.EventPricePolicyRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("AgencyEventBasicService 통합 테스트")
class AgencyEventBasicServiceTest {

    @Autowired
    private AgencyEventBasicService agencyEventBasicService;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventPricePolicyRepository eventPricePolicyRepository;

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
        eventPricePolicyRepository.deleteAllInBatch();
        eventRepository.deleteAllInBatch();
        venueRepository.deleteAllInBatch();
        categoryRepository.deleteAllInBatch();
        organizerRepository.deleteAllInBatch();
    }

    @Test
    @DisplayName("공연 기본정보를 등록하면 공연이 저장된다")
    void createBasicEvent_success() {
        AgencyCreateEventBasicRequest request = new AgencyCreateEventBasicRequest(
                organizer.getId(),
                venue.getId(),
                category.getId(),
                "기획사 등록 공연",
                Instant.parse("2026-07-01T10:00:00Z"),
                Instant.parse("2026-07-01T12:00:00Z"),
                List.of("rock", "live"),
                "공연 공지"
        );

        AgencyCreateEventResponse response = agencyEventBasicService.createBasicEvent(request);

        Event savedEvent = eventRepository.findById(response.eventId()).orElseThrow();
        List<EventPricePolicy> savedPolicies = eventPricePolicyRepository.findByEventIdOrderByDisplayOrderAsc(response.eventId());

        assertThat(response.title()).isEqualTo("기획사 등록 공연");
        assertThat(savedEvent.getOrganizer().getId()).isEqualTo(organizer.getId());
        assertThat(savedEvent.getVenue().getId()).isEqualTo(venue.getId());
        assertThat(savedEvent.getCategory().getId()).isEqualTo(category.getId());
        assertThat(savedEvent.getStatus()).isEqualTo(Event.Status.PENDING);
        assertThat(savedEvent.getSalesStartAt()).isNull();
        assertThat(savedEvent.getSalesEndAt()).isNull();
        assertThat(savedPolicies).isEmpty();
    }

    @Test
    @DisplayName("공연 시작 시각이 종료 시각보다 늦으면 예외가 발생한다")
    void createBasicEvent_invalidTimeline() {
        AgencyCreateEventBasicRequest request = new AgencyCreateEventBasicRequest(
                organizer.getId(),
                venue.getId(),
                category.getId(),
                "잘못된 공연",
                Instant.parse("2026-07-01T12:00:00Z"),
                Instant.parse("2026-07-01T10:00:00Z"),
                List.of(),
                null
        );

        assertThatThrownBy(() -> agencyEventBasicService.createBasicEvent(request))
                .isInstanceOf(BaseException.class)
                .extracting("errorCode")
                .isEqualTo(GlobalErrorCode.INVALID_REQUEST);
    }

    @Test
    @DisplayName("공연 가격정책을 등록하면 가격 정책이 저장된다")
    void createPricePolicies_success() {
        Event event = eventRepository.save(createEvent("가격 정책 공연"));

        AgencyCreateEventPricePoliciesRequest request = new AgencyCreateEventPricePoliciesRequest(
                List.of(
                        new AgencyCreateEventPricePolicyRequest(
                                SeatGrade.VIP,
                                new BigDecimal("220000"),
                                List.of(
                                        new AgencyCreateEventPricePolicyRequest.DiscountInfoRequest(
                                                "기본 할인",
                                                new BigDecimal("10"),
                                                new BigDecimal("198000")
                                        )
                                ),
                                "KRW",
                                0
                        ),
                        new AgencyCreateEventPricePolicyRequest(
                                SeatGrade.R,
                                new BigDecimal("150000"),
                                List.of(),
                                "KRW",
                                1
                        )
                )
        );

        agencyEventBasicService.createPricePolicies(event.getId(), request);

        List<EventPricePolicy> savedPolicies = eventPricePolicyRepository.findByEventIdOrderByDisplayOrderAsc(event.getId());
        assertThat(savedPolicies).hasSize(2);
        assertThat(savedPolicies.get(0).getPriceGrade()).isEqualTo(SeatGrade.VIP);
        assertThat(savedPolicies.get(0).getDiscountInfo()).hasSize(1);
        assertThat(savedPolicies.get(1).getPriceGrade()).isEqualTo(SeatGrade.R);
        assertThat(savedPolicies.get(1).getDiscountInfo()).isEmpty();
    }

    @Test
    @DisplayName("이미 가격정책이 등록된 공연에 다시 등록하면 예외가 발생한다")
    void createPricePolicies_alreadyRegistered() {
        Event event = eventRepository.save(createEvent("중복 가격 정책 공연"));
        eventPricePolicyRepository.save(createPricePolicy(event, SeatGrade.VIP, 220000));

        AgencyCreateEventPricePoliciesRequest request = new AgencyCreateEventPricePoliciesRequest(
                List.of(
                        new AgencyCreateEventPricePolicyRequest(
                                SeatGrade.R,
                                new BigDecimal("150000"),
                                List.of(),
                                "KRW",
                                1
                        )
                )
        );

        assertThatThrownBy(() -> agencyEventBasicService.createPricePolicies(event.getId(), request))
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
