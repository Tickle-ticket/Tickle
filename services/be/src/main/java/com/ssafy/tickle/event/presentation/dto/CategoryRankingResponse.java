package com.ssafy.tickle.event.presentation.dto;

import com.ssafy.tickle.event.infrastructure.cache.model.CachedCategoryRankingResponse;

import java.util.List;
import java.util.Set;

/**
 * 랭킹 조회 응답의 바깥 래퍼 DTO입니다.
 *
 * @param categoryId 카테고리 식별자
 * @param categoryName 카테고리명
 * @param rankings 랭킹 목록
 */
public record CategoryRankingResponse(
        Long categoryId,
        String categoryName,
        List<EventRankingResponse> rankings
) {

    public static CategoryRankingResponse from(
            Long categoryId,
            String categoryName,
            List<EventRankingResponse> eventRankingResponse) {
        return new CategoryRankingResponse(
                categoryId,
                categoryName,
                eventRankingResponse
        );
    }

    public static CategoryRankingResponse from(
            CachedCategoryRankingResponse cachedResponse,
            Set<Long> favoriteEventIds
    ) {
        // 캐시 응답은 공용 데이터만 가지므로, 최종 응답 생성 시 사용자별 favorite 여부를 합칩니다.
        List<EventRankingResponse> rankings = cachedResponse.rankings().stream()
                .map(item -> EventRankingResponse.from(
                        item,
                        favoriteEventIds.contains(item.eventId())
                ))
                .toList();

        return new CategoryRankingResponse(
                cachedResponse.categoryId(),
                cachedResponse.categoryName(),
                rankings
        );
    }
}
