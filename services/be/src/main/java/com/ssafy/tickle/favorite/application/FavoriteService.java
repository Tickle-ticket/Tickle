package com.ssafy.tickle.favorite.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventImage;
import com.ssafy.tickle.event.infrastructure.persistence.EventImageRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.event.presentation.dto.EventSummaryResponse;
import com.ssafy.tickle.favorite.domain.Favorite;
import com.ssafy.tickle.favorite.infrastructure.persistence.FavoriteRepository;
import com.ssafy.tickle.favorite.presentation.dto.FavoriteCreateResponse;
import com.ssafy.tickle.favorite.presentation.dto.FavoriteEventsResponse;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 공연 찜 관련 비즈니스 로직을 처리하는 서비스 클래스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final EventImageRepository eventImageRepository;

    /**
     * 공연 찜을 등록합니다.
     *
     * @param userId 사용자 식별자
     * @param eventId 공연 식별자
     * @return 찜 등록 응답
     */
    @Transactional
    public FavoriteCreateResponse createFavorite(Long userId, Long eventId) {
        User user = getUser(userId);
        Event event = getEvent(eventId);

        if (favoriteRepository.existsByUser_IdAndEvent_Id(userId, eventId)) {
            throw new BaseException(GlobalErrorCode.CONFLICT, "이미 찜한 공연입니다.");
        }

        Favorite favorite = favoriteRepository.save(Favorite.builder()
                .user(user)
                .event(event)
                .build());

        return FavoriteCreateResponse.from(favorite);
    }

    /**
     * 공연 찜을 해제합니다.
     *
     * @param userId 사용자 식별자
     * @param eventId 공연 식별자
     */
    @Transactional
    public void deleteFavorite(Long userId, Long eventId) {
        validateUserId(userId);
        validateEventId(eventId);

        Favorite favorite = favoriteRepository.findByUser_IdAndEvent_Id(userId, eventId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "찜한 공연을 찾을 수 없습니다."));

        favoriteRepository.delete(favorite);
    }

    /**
     * 내 찜 공연 목록을 조회합니다.
     *
     * @param userId 사용자 식별자
     * @param page 페이지 번호
     * @param size 페이지 크기
     * @return 내 찜 공연 목록 응답
     */
    public FavoriteEventsResponse getFavoriteEvents(Long userId, int page, int size) {
        validateUserId(userId);
        getUser(userId);

        Page<Favorite> favoritePage = favoriteRepository.findByUser_IdOrderByCreatedAtDescIdDesc(
                userId,
                PageRequest.of(page, size)
        );

        List<Long> eventIds = favoritePage.getContent().stream()
                .map(favorite -> favorite.getEvent().getId())
                .toList();

        Map<Long, String> thumbnailUrlByEventId = getThumbnailUrlByEventId(eventIds);
        List<EventSummaryResponse> items = favoritePage.getContent().stream()
                .map(favorite -> EventSummaryResponse.from(
                        favorite.getEvent(),
                        thumbnailUrlByEventId.get(favorite.getEvent().getId()),
                        true
                ))
                .toList();

        return FavoriteEventsResponse.from(favoritePage, items);
    }

    private User getUser(Long userId) {
        validateUserId(userId);
        return userRepository.findById(userId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "사용자를 찾을 수 없습니다."));
    }

    private Event getEvent(Long eventId) {
        validateEventId(eventId);

        return eventRepository.findById(eventId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "공연을 찾을 수 없습니다."));
    }

    private void validateUserId(Long userId) {
        if (userId == null) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "userId 쿼리 파라미터는 필수입니다.");
        }
    }

    private void validateEventId(Long eventId) {
        if (eventId == null) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "eventId는 필수입니다.");
        }
    }

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
            thumbnailUrlByEventId.putIfAbsent(image.getEvent().getId(), image.getImageUrl());
        }

        return thumbnailUrlByEventId;
    }
}
