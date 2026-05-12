package com.ssafy.tickle.event.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.category.domain.Category;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventImage;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.cache.model.CachedCategoryRankingResponse;
import com.ssafy.tickle.event.infrastructure.cache.model.CachedEventRankingItem;
import com.ssafy.tickle.event.infrastructure.cache.model.CachedEventSessionsResponse;
import com.ssafy.tickle.event.infrastructure.cache.model.CachedOpeningSoonEvent;
import com.ssafy.tickle.event.infrastructure.cache.model.CachedOpeningSoonEventsResponse;
import com.ssafy.tickle.event.infrastructure.cache.store.EventRankingCacheStore;
import com.ssafy.tickle.event.infrastructure.cache.store.EventSessionsCacheStore;
import com.ssafy.tickle.event.infrastructure.cache.store.OpeningSoonEventCacheStore;
import com.ssafy.tickle.category.infrastructure.persistence.CategoryRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventImageRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventPricePolicyRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.event.presentation.dto.CategoryRankingResponse;
import com.ssafy.tickle.event.presentation.dto.EventDetailResponse;
import com.ssafy.tickle.event.presentation.dto.EventListResponse;
import com.ssafy.tickle.event.presentation.dto.EventRankingResponse;
import com.ssafy.tickle.event.presentation.dto.EventSessionsResponse;
import com.ssafy.tickle.event.presentation.dto.EventSummaryResponse;
import com.ssafy.tickle.event.presentation.dto.OpeningSoonEventResponse;
import com.ssafy.tickle.event.presentation.dto.OpeningSoonEventsResponse;
import com.ssafy.tickle.favorite.infrastructure.persistence.FavoriteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.time.Instant;

/**
 * 이벤트 조회 관련 비즈니스 로직을 처리하는 서비스 클래스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventService {

    private static final int CATEGORY_RANKING_LIMIT = 5;
    private static final int DEFAULT_OPENING_SOON_LIMIT = 5;

    private final EventRepository eventRepository;
    private final CategoryRepository categoryRepository;
    private final EventImageRepository eventImageRepository;
    private final EventSessionRepository eventSessionRepository;
    private final EventPricePolicyRepository eventPricePolicyRepository;
    private final FavoriteRepository favoriteRepository;
    private final EventRankingCacheStore eventRankingCacheStore;
    private final OpeningSoonEventCacheStore openingSoonEventCacheStore;
    private final EventSessionsCacheStore eventSessionsCacheStore;

    /**
     * 이벤트 상세 정보를 조회합니다.
     *
     * @param eventId 이벤트 식별자
     * @return 이벤트 상세 응답
     */
    public EventDetailResponse getEventDetail(Long eventId) {
        return getEventDetail(eventId, null);
    }

    /**
     * 이벤트 상세 정보를 조회합니다.
     *
     * @param eventId 이벤트 식별자
     * @param userId 사용자 식별자
     * @return 이벤트 상세 응답
     */
    public EventDetailResponse getEventDetail(Long eventId, Long userId) {
        Event event = eventRepository.findWithDetailsById(eventId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "공연을 찾을 수 없습니다."));

        List<EventImage> images = eventImageRepository.findByEventIdOrderByDisplayOrderAsc(eventId);
        List<EventSession> sessions = eventSessionRepository.findByEventIdOrderByStartAtAsc(eventId);
        List<EventPricePolicy> pricePolicies = eventPricePolicyRepository.findByEventIdOrderByDisplayOrderAsc(eventId);

        return EventDetailResponse.from(event, images, sessions, pricePolicies, isFavorite(userId, eventId));
    }

    /**
     * 특정 공연의 회차 목록을 조회합니다.
     *
     * @param eventId 공연 식별자
     * @return 공연 회차 목록 응답
     */
    public EventSessionsResponse getEventSessions(Long eventId) {
        return eventSessionsCacheStore.findByEventId(eventId)
                .map(EventSessionsResponse::from)
                .orElseGet(() -> getEventSessionsFromDatabase(eventId));
    }

    private EventSessionsResponse getEventSessionsFromDatabase(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "공연을 찾을 수 없습니다."));

        List<EventSession> sessions = eventSessionRepository.findByEventIdOrderByStartAtAsc(eventId);
        CachedEventSessionsResponse cachedResponse = CachedEventSessionsResponse.from(sessions);
        eventSessionsCacheStore.save(eventId, cachedResponse, event.getSalesEndAt());
        return EventSessionsResponse.from(cachedResponse);
    }

    /**
     * 이벤트 목록을 조회합니다.
     *
     * @param keyword 제목 검색어
     * @param categoryId 카테고리 식별자
     * @param page 페이지 번호
     * @param size 페이지 크기
     * @return 이벤트 목록 응답
     */
    public EventListResponse getEvents(String keyword, Long categoryId, int page, int size) {
        return getEvents(keyword, categoryId, page, size, null);
    }

    /**
     * 이벤트 목록을 조회합니다.
     *
     * @param keyword 제목 검색어
     * @param categoryId 카테고리 식별자
     * @param page 페이지 번호
     * @param size 페이지 크기
     * @param userId 사용자 식별자
     * @return 이벤트 목록 응답
     */
    public EventListResponse getEvents(String keyword, Long categoryId, int page, int size, Long userId) {
        PageRequest pageRequest = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Order.asc("eventStartAt"), Sort.Order.asc("id"))
        );

        Page<Event> eventPage = eventRepository.searchEvents(normalizeKeyword(keyword), categoryId, pageRequest);
        List<Long> eventIds = eventPage.getContent().stream()
                .map(Event::getId)
                .toList();

        Map<Long, String> thumbnailUrlByEventId = getThumbnailUrlByEventId(eventIds);
        Set<Long> favoriteEventIds = getFavoriteEventIds(userId, eventIds);
        List<EventSummaryResponse> items = eventPage.getContent().stream()
                .map(event -> EventSummaryResponse.from(
                        event,
                        thumbnailUrlByEventId.get(event.getId()),
                        favoriteEventIds.contains(event.getId())
                ))
                .toList();

        return EventListResponse.from(eventPage, items);
    }

    /**
     * 랭킹 이벤트 TOP5를 조회합니다.
     *
     * @param categoryId 카테고리 식별자(없으면 전체)
     * @return 랭킹 응답 목록
     */
    public CategoryRankingResponse getRanking(Long categoryId) {
        return getRanking(categoryId, null);
    }

    /**
     * 랭킹 이벤트 TOP5를 조회합니다.
     *
     * @param categoryId 카테고리 식별자(없으면 전체)
     * @param userId 사용자 식별자
     * @return 랭킹 응답 목록
     */
    public CategoryRankingResponse getRanking(Long categoryId, Long userId) {
        Optional<CachedCategoryRankingResponse> cachedResponse =
                eventRankingCacheStore.findByCategoryId(categoryId);

        if (cachedResponse.isPresent()) {
            // 개인화 여부는 캐시에 저장하지 않고, 조회 시 eventId 목록 기준으로만 붙입니다.
            List<Long> eventIds = cachedResponse.get().rankings().stream()
                    .map(CachedEventRankingItem::eventId)
                    .toList();
            Set<Long> favoriteEventIds = getFavoriteEventIds(userId, eventIds);
            return CategoryRankingResponse.from(cachedResponse.get(), favoriteEventIds);
        }

        List<Event> rankingEvents = eventRepository.findRankingEvents(
                Instant.now(),
                categoryId,
                PageRequest.of(
                        0,
                        CATEGORY_RANKING_LIMIT,
                        Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))
                )
        );

        List<Long> eventIds = rankingEvents.stream()
                .map(Event::getId)
                .distinct()
                .toList();

        Map<Long, String> thumbnailUrlByEventId = getThumbnailUrlByEventId(eventIds);
        List<CachedEventRankingItem> items = new ArrayList<>();

        for (Event event : rankingEvents) {
            items.add(CachedEventRankingItem.from(
                    items.size() + 1,
                    event,
                    thumbnailUrlByEventId.get(event.getId())
            ));
        }

        CachedCategoryRankingResponse response = new CachedCategoryRankingResponse(
                categoryId,
                resolveCategoryName(categoryId),
                new ArrayList<>(items)
        );

        // 랭킹 캐시는 공용 데이터만 저장하고, 사용자별 favorite 여부는 응답 단계에서 조합합니다.
        eventRankingCacheStore.save(categoryId, response);
        Set<Long> favoriteEventIds = getFavoriteEventIds(userId, eventIds);
        return CategoryRankingResponse.from(response, favoriteEventIds);
    }

    /**
     * 오픈 임박 공연 목록을 조회합니다.
     *
     * @return 오픈 임박 공연 목록
     */
    public OpeningSoonEventsResponse getOpeningSoonEvents() {
        return getOpeningSoonEvents(null);
    }

    /**
     * 오픈 임박 공연 목록을 조회합니다.
     *
     * @param userId 사용자 식별자
     * @return 오픈 임박 공연 목록
     */
    public OpeningSoonEventsResponse getOpeningSoonEvents(Long userId) {
        Optional<CachedOpeningSoonEventsResponse> cachedResponse = openingSoonEventCacheStore.find();

        if (cachedResponse.isPresent()) {
            // 오픈 임박 캐시도 공용 응답만 보관하고, favorite 여부는 요청 사용자 기준으로 계산합니다.
            List<Long> eventIds = cachedResponse.get().events().stream()
                    .map(CachedOpeningSoonEvent::eventId)
                    .toList();
            Set<Long> favoriteEventIds = getFavoriteEventIds(userId, eventIds);
            return OpeningSoonEventsResponse.from(cachedResponse.get(), favoriteEventIds);
        }

        List<Event> events = eventRepository.findBySalesStartAtAfter(
                Instant.now(),
                PageRequest.of(
                        0,
                        DEFAULT_OPENING_SOON_LIMIT,
                        Sort.by(Sort.Order.asc("salesStartAt"), Sort.Order.asc("id"))
                )
        );

        List<Long> eventIds = events.stream()
                .map(Event::getId)
                .distinct()
                .toList();

        Map<Long, String> thumbnailUrlByEventId = getThumbnailUrlByEventId(eventIds);
        List<CachedOpeningSoonEvent> items = events.stream()
                .map(event -> CachedOpeningSoonEvent.from(
                        event,
                        thumbnailUrlByEventId.get(event.getId())
                ))
                .toList();

        CachedOpeningSoonEventsResponse response = new CachedOpeningSoonEventsResponse(items);

        // 캐시 적중률을 유지하기 위해 사용자별 필드는 Redis에 넣지 않습니다.
        openingSoonEventCacheStore.save(response);
        Set<Long> favoriteEventIds = getFavoriteEventIds(userId, eventIds);
        return OpeningSoonEventsResponse.from(response, favoriteEventIds);
    }

    /**
     * 이벤트 검색어를 정규화합니다.
     *
     * @param keyword 원본 검색어
     * @return 정규화된 검색어
     */
    private String normalizeKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }

        String normalized = keyword.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    /**
     * 이벤트별 썸네일 이미지 URL을 조회합니다.
     *
     * @param eventIds 이벤트 식별자 목록
     * @return 이벤트별 썸네일 URL 매핑
     */
    private Map<Long, String> getThumbnailUrlByEventId(List<Long> eventIds) {
        if (eventIds.isEmpty()) {
            return Map.of();
        }

        List<EventImage> images = eventImageRepository.findByEventIdInAndImageTypeOrderByEventIdAscDisplayOrderAsc(
                eventIds,
                EventImage.ImageType.THUMBNAIL
        );
        Map<Long, String> thumbnailUrlByEventId = new LinkedHashMap<>();

        for (EventImage image : images) {
            // 정렬된 결과 기준으로 각 이벤트의 첫 번째 썸네일만 대표 이미지로 사용
            thumbnailUrlByEventId.putIfAbsent(image.getEvent().getId(), image.getImageUrl());
        }

        return thumbnailUrlByEventId;
    }

    private Set<Long> getFavoriteEventIds(Long userId, List<Long> eventIds) {
        if (userId == null || eventIds.isEmpty()) {
            return Set.of();
        }

        return new HashSet<>(favoriteRepository.findFavoriteEventIdsByUserIdAndEventIds(userId, eventIds));
    }

    private boolean isFavorite(Long userId, Long eventId) {
        if (userId == null) {
            return false;
        }

        return favoriteRepository.existsByUser_IdAndEvent_Id(userId, eventId);
    }

    private String resolveCategoryName(Long categoryId) {
        if (categoryId == null) {
            return "ALL";
        }

        return categoryRepository.findById(categoryId)
                .map(Category::getCategoryName)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "카테고리를 찾을 수 없습니다."));
    }
}
