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
import com.ssafy.tickle.common.util.S3Uploader;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventImage;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.infrastructure.persistence.EventImageRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventPricePolicyRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.organizer.domain.Organizer;
import com.ssafy.tickle.organizer.infrastructure.persistence.OrganizerRepository;
import com.ssafy.tickle.venue.domain.Venue;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueRepository;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.domain.UserRole;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("AgencyEventBasicService 통합 테스트")
class AgencyEventBasicServiceTest {

    @Autowired
    private AgencyEventBasicService agencyEventBasicService;

    @MockBean
    private S3Uploader s3Uploader;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventPricePolicyRepository eventPricePolicyRepository;

    @Autowired
    private EventImageRepository eventImageRepository;

    @Autowired
    private OrganizerRepository organizerRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private UserRepository userRepository;

    private static final String MOCK_POSTER_URL = "https://cdn.test/poster.jpg";
    private static final String MOCK_DETAIL_URL_1 = "https://cdn.test/detail-1.jpg";
    private static final String MOCK_DETAIL_URL_2 = "https://cdn.test/detail-2.jpg";

    private MultipartFile mockPosterImage;
    private List<MultipartFile> mockDetailImages;

    private Organizer organizer;
    private Venue venue;
    private Category category;
    private User agencyUser;

    @BeforeEach
    void setUp() {
        organizer = organizerRepository.save(createOrganizer("테스트 기획사"));
        venue = venueRepository.save(createVenue("테스트 공연장"));
        category = categoryRepository.save(createCategory("콘서트"));
        
        agencyUser = userRepository.save(User.builder()
                .id(1001L)
                .userNo("USER-1001")
                .name("기획자")
                .role(UserRole.ORGANIZER)
                .status(User.Status.ACTIVE)
                .organizerId(organizer.getId())
                .build());

        mockPosterImage = new MockMultipartFile("posterImage", "poster.jpg", "image/jpeg", "fake".getBytes());
        mockDetailImages = List.of(
                new MockMultipartFile("detailImages", "detail-1.jpg", "image/jpeg", "fake1".getBytes()),
                new MockMultipartFile("detailImages", "detail-2.jpg", "image/jpeg", "fake2".getBytes())
        );

        given(s3Uploader.upload(any(), eq("events/poster"))).willReturn(MOCK_POSTER_URL);
        given(s3Uploader.upload(any(), eq("events/detail")))
                .willReturn(MOCK_DETAIL_URL_1)
                .willReturn(MOCK_DETAIL_URL_2);
    }

    @AfterEach
    void tearDown() {
        eventImageRepository.deleteAllInBatch();
        eventPricePolicyRepository.deleteAllInBatch();
        eventRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
        venueRepository.deleteAllInBatch();
        categoryRepository.deleteAllInBatch();
        organizerRepository.deleteAllInBatch();
    }

    @Test
    @DisplayName("공연 기본정보를 등록하면 공연이 저장된다.")
    void createBasicEvent_success() {
        AgencyCreateEventBasicRequest request = new AgencyCreateEventBasicRequest(
                venue.getId(),
                category.getId(),
                "기획사 등록 공연",
                Instant.parse("2026-07-01T10:00:00Z"),
                Instant.parse("2026-07-01T12:00:00Z"),
                List.of("rock", "live"),
                "공연 공지"
        );

        AgencyCreateEventResponse response = agencyEventBasicService.createBasicEvent(
                agencyUser.getId(), request, mockPosterImage, mockDetailImages
        );

        Event savedEvent = eventRepository.findById(response.eventId()).orElseThrow();
        List<EventImage> savedImages = eventImageRepository.findByEventIdOrderByDisplayOrderAsc(response.eventId());
        List<EventPricePolicy> savedPolicies = eventPricePolicyRepository.findByEventIdOrderByDisplayOrderAsc(response.eventId());

        assertThat(response.title()).isEqualTo("기획사 등록 공연");
        assertThat(savedEvent.getOrganizer().getId()).isEqualTo(organizer.getId());
        assertThat(savedEvent.getVenue().getId()).isEqualTo(venue.getId());
        assertThat(savedEvent.getCategory().getId()).isEqualTo(category.getId());
        assertThat(savedEvent.getStatus()).isEqualTo(Event.Status.PENDING);
        assertThat(savedEvent.getSalesStartAt()).isNull();
        assertThat(savedEvent.getSalesEndAt()).isNull();
        assertThat(savedImages).hasSize(4);
        assertThat(savedImages)
                .extracting(EventImage::getImageType, EventImage::getImageUrl, EventImage::getDisplayOrder)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(EventImage.ImageType.POSTER, "https://cdn.test/poster.jpg", 0),
                        org.assertj.core.groups.Tuple.tuple(EventImage.ImageType.THUMBNAIL, "https://cdn.test/poster.jpg", 0),
                        org.assertj.core.groups.Tuple.tuple(EventImage.ImageType.DETAIL, "https://cdn.test/detail-1.jpg", 0),
                        org.assertj.core.groups.Tuple.tuple(EventImage.ImageType.DETAIL, "https://cdn.test/detail-2.jpg", 1)
                );
        assertThat(savedPolicies).isEmpty();
    }

    @Test
    @DisplayName("공연 시작 시각이 종료 시각보다 늦으면 예외가 발생한다.")
    void createBasicEvent_invalidTimeline() {
        AgencyCreateEventBasicRequest request = new AgencyCreateEventBasicRequest(
                venue.getId(),
                category.getId(),
                "잘못된 공연",
                Instant.parse("2026-07-01T12:00:00Z"),
                Instant.parse("2026-07-01T10:00:00Z"),
                List.of(),
                null
        );

        assertThatThrownBy(() -> agencyEventBasicService.createBasicEvent(agencyUser.getId(), request, mockPosterImage, List.of()))
                .isInstanceOf(BaseException.class)
                .extracting("errorCode")
                .isEqualTo(GlobalErrorCode.INVALID_REQUEST);
    }

    @Test
    @DisplayName("ORGANIZER 권한이 아니면 공연 기본정보 등록 시 예외가 발생한다")
    void createBasicEvent_notOrganizerRole() {
        User normalUser = userRepository.save(User.builder()
                .id(1002L)
                .userNo("USER-1002")
                .name("일반회원")
                .role(UserRole.USER)
                .status(User.Status.ACTIVE)
                .organizerId(organizer.getId())
                .build());
        AgencyCreateEventBasicRequest request = new AgencyCreateEventBasicRequest(
                venue.getId(),
                category.getId(),
                "권한 없는 공연",
                Instant.parse("2026-07-01T10:00:00Z"),
                Instant.parse("2026-07-01T12:00:00Z"),
                List.of(),
                null
        );

        assertThatThrownBy(() -> agencyEventBasicService.createBasicEvent(
                normalUser.getId(), request, mockPosterImage, List.of()
        ))
                .isInstanceOf(BaseException.class)
                .extracting("errorCode")
                .isEqualTo(GlobalErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("공연 가격정책을 등록하면 가격 정책이 저장된다.")
    void createPricePolicies_success() {
        Event event = eventRepository.save(createEvent("가격 정책 공연"));

        AgencyCreateEventPricePoliciesRequest request = new AgencyCreateEventPricePoliciesRequest(
                List.of(
                        new AgencyCreateEventPricePolicyRequest(
                                SeatGrade.VIP,
                                new BigDecimal("220000"),
                                List.of(
                                        new AgencyCreateEventPricePolicyRequest.PriceInfoRequest(
                                                "기본 할인",
                                                new BigDecimal("10")
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

        agencyEventBasicService.createPricePolicies(agencyUser.getId(), event.getId(), request);

        List<EventPricePolicy> savedPolicies = eventPricePolicyRepository.findByEventIdOrderByDisplayOrderAsc(event.getId());
        assertThat(savedPolicies).hasSize(2);
        assertThat(savedPolicies.get(0).getPriceGrade()).isEqualTo(SeatGrade.VIP);
        assertThat(savedPolicies.get(0).getPriceAmount()).isEqualByComparingTo("220000");
        assertThat(savedPolicies.get(0).getDiscountInfo())
                .extracting(
                        EventPricePolicy.DiscountInfo::discountName,
                        EventPricePolicy.DiscountInfo::discountRate,
                        EventPricePolicy.DiscountInfo::actualPriceAmount
                )
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("일반", BigDecimal.ZERO, new BigDecimal("220000")),
                        org.assertj.core.groups.Tuple.tuple("기본 할인", new BigDecimal("10"), new BigDecimal("198000.00"))
                );
        assertThat(savedPolicies.get(1).getPriceGrade()).isEqualTo(SeatGrade.R);
        assertThat(savedPolicies.get(1).getDiscountInfo())
                .extracting(
                        EventPricePolicy.DiscountInfo::discountName,
                        EventPricePolicy.DiscountInfo::discountRate,
                        EventPricePolicy.DiscountInfo::actualPriceAmount
                )
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("일반", BigDecimal.ZERO, new BigDecimal("150000"))
                );
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

        assertThatThrownBy(() -> agencyEventBasicService.createPricePolicies(agencyUser.getId(), event.getId(), request))
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
