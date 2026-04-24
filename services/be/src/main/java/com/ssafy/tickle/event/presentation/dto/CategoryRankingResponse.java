package com.ssafy.tickle.event.presentation.dto;

import java.util.List;

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
}
