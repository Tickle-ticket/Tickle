package com.ssafy.tickle.favorite.application;

import com.ssafy.tickle.category.domain.Category;
import com.ssafy.tickle.category.infrastructure.persistence.CategoryRepository;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventImage;
import com.ssafy.tickle.event.infrastructure.persistence.EventImageRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.favorite.infrastructure.persistence.FavoriteRepository;
import com.ssafy.tickle.favorite.presentation.dto.FavoriteCreateResponse;
import com.ssafy.tickle.favorite.presentation.dto.FavoriteEventsResponse;
import com.ssafy.tickle.organizer.domain.Organizer;
import com.ssafy.tickle.organizer.infrastructure.persistence.OrganizerRepository;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import com.ssafy.tickle.venue.domain.Venue;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 공연 찜 서비스 통합 테스트입니다.
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("FavoriteService 통합 테스트")
class FavoriteServiceTest {

    @Autowired
    private FavoriteService favoriteService;

    @Autowired
    private FavoriteRepository favoriteRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventImageRepository eventImageRepository;

    @Autowired
    private OrganizerRepository organizerRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @AfterEach
    void tearDown() {
        favoriteRepository.deleteAllInBatch();
        eventImageRepository.deleteAllInBatch();
        eventRepository.deleteAllInBatch();
        categoryRepository.deleteAllInBatch();
        venueRepository.deleteAllInBatch();
        organizerRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
    }

    @Nested
    @DisplayName("공연 찜 등록")
    class CreateFavoriteTest {

        @Test
        @DisplayName("사용자와 공연이 존재하면 찜을 등록한다")
        void createFavorite_success() {
            User user = userRepository.save(createUser());
            Event event = eventRepository.save(createEvent("찜할 공연"));

            FavoriteCreateResponse response = favoriteService.createFavorite(user.getId(), event.getId());

            assertThat(response.userId()).isEqualTo(user.getId());
            assertThat(response.eventId()).isEqualTo(event.getId());
            assertThat(favoriteRepository.existsByUser_IdAndEvent_Id(user.getId(), event.getId())).isTrue();
        }

        @Test
        @DisplayName("이미 찜한 공연이면 CONFLICT 예외가 발생한다")
        void createFavorite_conflict() {
            User user = userRepository.save(createUser());
            Event event = eventRepository.save(createEvent("중복 찜 공연"));
            favoriteService.createFavorite(user.getId(), event.getId());

            assertThatThrownBy(() -> favoriteService.createFavorite(user.getId(), event.getId()))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.CONFLICT);
        }
    }

    @Nested
    @DisplayName("공연 찜 해제")
    class DeleteFavoriteTest {

        @Test
        @DisplayName("찜한 공연이면 해제 후 목록에서 사라진다")
        void deleteFavorite_success() {
            User user = userRepository.save(createUser());
            Event event = eventRepository.save(createEvent("해제할 공연"));
            favoriteService.createFavorite(user.getId(), event.getId());

            favoriteService.deleteFavorite(user.getId(), event.getId());

            assertThat(favoriteRepository.existsByUser_IdAndEvent_Id(user.getId(), event.getId())).isFalse();
        }
    }

    @Nested
    @DisplayName("내 찜 공연 목록 조회")
    class GetFavoriteEventsTest {

        @Test
        @DisplayName("최신순으로 찜 공연 목록을 반환한다")
        void getFavoriteEvents_success() {
            User user = userRepository.save(createUser());
            Event firstEvent = eventRepository.save(createEvent("첫 번째 공연"));
            Event secondEvent = eventRepository.save(createEvent("두 번째 공연"));

            eventImageRepository.saveAll(List.of(
                    createThumbnail(firstEvent, "https://cdn.test/first.jpg", 0),
                    createThumbnail(secondEvent, "https://cdn.test/second.jpg", 0)
            ));

            favoriteService.createFavorite(user.getId(), firstEvent.getId());
            favoriteService.createFavorite(user.getId(), secondEvent.getId());

            FavoriteEventsResponse response = favoriteService.getFavoriteEvents(user.getId(), 0, 20);

            assertThat(response.items()).hasSize(2);
            assertThat(response.items())
                    .extracting(item -> item.title())
                    .containsExactly("두 번째 공연", "첫 번째 공연");
            assertThat(response.items())
                    .extracting(item -> item.isFavorite())
                    .containsExactly(true, true);
        }
    }

    private User createUser() {
        User user = User.builder()
                .userNo("USER-1001")
                .email("favorite@test.com")
                .phoneNumber("010-0000-0000")
                .name("찜사용자")
                .nickname("찜쟁이")
                .profileImageUrl("https://cdn.test/user.png")
                .birthDate(LocalDate.of(1999, 1, 1))
                .status(User.Status.ACTIVE)
                .lastLoginAt(Instant.parse("2026-04-25T12:30:00Z"))
                .build();
        setAuditFields(user);
        return user;
    }

    private Event createEvent(String title) {
        Organizer organizer = organizerRepository.save(createOrganizer());
        Venue venue = venueRepository.save(createVenue());
        Category category = categoryRepository.save(createCategory());

        Event event = Event.builder()
                .organizer(organizer)
                .venue(venue)
                .title(title)
                .category(category)
                .salesStartAt(Instant.parse("2026-05-01T00:00:00Z"))
                .salesEndAt(Instant.parse("2026-05-10T00:00:00Z"))
                .eventStartAt(Instant.parse("2026-05-20T10:00:00Z"))
                .eventEndAt(Instant.parse("2026-05-20T12:00:00Z"))
                .metadata(new Event.EventMetadata(List.of("favorite")))
                .notice("테스트 공지")
                .status(Event.Status.OPENED)
                .build();
        setAuditFields(event);
        return event;
    }

    private EventImage createThumbnail(Event event, String imageUrl, int displayOrder) {
        EventImage eventImage = EventImage.builder()
                .event(event)
                .imageType(EventImage.ImageType.THUMBNAIL)
                .imageUrl(imageUrl)
                .displayOrder(displayOrder)
                .build();
        setAuditFields(eventImage);
        return eventImage;
    }

    private Organizer createOrganizer() {
        Organizer organizer = Organizer.builder()
                .organizerName("테스트 주최자")
                .businessNo("123-45-67890")
                .contactEmail("organizer@test.com")
                .contactPhone("02-1111-2222")
                .status(Organizer.Status.ACTIVE)
                .build();
        setAuditFields(organizer);
        return organizer;
    }

    private Venue createVenue() {
        Venue venue = Venue.builder()
                .venueName("테스트 공연장")
                .timezoneCode("Asia/Seoul")
                .countryCode("KR")
                .address("서울시 강남구 테스트길 1")
                .addressLine2("2층")
                .cityName("서울")
                .capacity(500)
                .build();
        setAuditFields(venue);
        return venue;
    }

    private Category createCategory() {
        Category category = Category.builder()
                .categoryName("콘서트")
                .build();
        setAuditFields(category);
        return category;
    }

    private void setAuditFields(Object target) {
        Instant now = Instant.parse("2026-04-20T00:00:00Z");
        ReflectionTestUtils.setField(target, "createdAt", now);
        ReflectionTestUtils.setField(target, "updatedAt", now);
    }
}
