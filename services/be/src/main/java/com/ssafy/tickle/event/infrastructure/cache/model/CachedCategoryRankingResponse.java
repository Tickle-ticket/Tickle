package com.ssafy.tickle.event.infrastructure.cache.model;

import java.util.List;

/**
 * 사용자별 정보가 제외된 랭킹 캐시 응답입니다.
 *
 * @param categoryId 카테고리 식별자
 * @param categoryName 카테고리명
 * @param rankings 랭킹 목록
 */
public record CachedCategoryRankingResponse(
        Long categoryId,
        String categoryName,
        List<CachedEventRankingItem> rankings
) {
}
