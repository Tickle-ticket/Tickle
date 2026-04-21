package com.ssafy.tickle.event.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventImage;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventImageRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventPricePolicyRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.event.presentation.dto.EventDetailResponse;
import com.ssafy.tickle.event.presentation.dto.EventListResponse;
import com.ssafy.tickle.event.presentation.dto.EventSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 이벤트 조회 관련 비즈니스 로직을 처리하는 서비스 클래스입니다.
 *
 * <p>이벤트 상세 및 목록 조회 유스케이스를 담당하며,
 * 목록 응답에 필요한 썸네일 이미지 매핑을 함께 처리합니다.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventService {

    private final EventRepository eventRepository;
    private final EventImageRepository eventImageRepository;
    private final EventSessionRepository eventSessionRepository;
    private final EventPricePolicyRepository eventPricePolicyRepository;

    /**
     * 이벤트 상세 정보를 조회합니다.
     *
     * @param eventId 이벤트 식별자
     * @return 이벤트 상세 응답
     */
    public EventDetailResponse getEventDetail(Long eventId) {
        Event event = eventRepository.findWithDetailsById(eventId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "공연을 찾을 수 없습니다."));

        List<EventImage> images = eventImageRepository.findByEvent_IdOrderByDisplayOrderAsc(eventId);
        List<EventSession> sessions = eventSessionRepository.findByEvent_IdOrderByStartAtAsc(eventId);
        List<EventPricePolicy> pricePolicies = eventPricePolicyRepository.findByEvent_IdOrderByDisplayOrderAsc(eventId);

        return EventDetailResponse.from(event, images, sessions, pricePolicies);
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
        List<EventSummaryResponse> items = eventPage.getContent().stream()
                .map(event -> EventSummaryResponse.from(event, thumbnailUrlByEventId.get(event.getId())))
                .toList();

        return EventListResponse.from(eventPage, items);
    }

    /**
     * 이벤트 검색어를 정규화합니다.
     *
     * <p>공백만 포함된 검색어는 검색 조건이 없는 것으로 간주하여
     * {@code null}로 변환합니다.</p>
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
     * <p>{@link EventImage.ImageType#THUMBNAIL} 타입 이미지만 조회하며,
     * 동일 이벤트에 썸네일이 여러 장인 경우 노출 순서가 가장 앞선 이미지를 사용합니다.</p>
     *
     * @param eventIds 이벤트 식별자 목록
     * @return 이벤트별 썸네일 URL 매핑
     */
    private Map<Long, String> getThumbnailUrlByEventId(List<Long> eventIds) {
        if (eventIds.isEmpty()) {
            return Map.of();
        }

        List<EventImage> images = eventImageRepository.findByEvent_IdInAndImageTypeOrderByEvent_IdAscDisplayOrderAsc(
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
}
