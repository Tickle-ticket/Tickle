package com.ssafy.tickle.favorite.presentation.dto;

import com.ssafy.tickle.favorite.domain.Favorite;

import java.time.Instant;

/**
 * 공연 찜 등록 응답 DTO입니다.
 *
 * @param favoriteId 찜 식별자
 * @param userId 사용자 식별자
 * @param eventId 공연 식별자
 * @param createdAt 찜 생성 시각
 */
public record FavoriteCreateResponse(
        Long favoriteId,
        Long userId,
        Long eventId,
        Instant createdAt
) {

    public static FavoriteCreateResponse from(Favorite favorite) {
        return new FavoriteCreateResponse(
                favorite.getId(),
                favorite.getUser().getId(),
                favorite.getEvent().getId(),
                favorite.getCreatedAt()
        );
    }
}
