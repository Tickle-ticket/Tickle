package com.ssafy.tickle.favorite.presentation.dto;

import com.ssafy.tickle.event.presentation.dto.EventSummaryResponse;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * 내 찜 공연 목록 응답 DTO입니다.
 *
 * @param items 찜한 공연 목록
 * @param page 현재 페이지 번호
 * @param size 페이지 크기
 * @param totalElements 전체 데이터 수
 * @param totalPages 전체 페이지 수
 * @param hasNext 다음 페이지 존재 여부
 */
public record FavoriteEventsResponse(
        List<EventSummaryResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext
) {

    public static FavoriteEventsResponse from(Page<?> pageResult, List<EventSummaryResponse> items) {
        return new FavoriteEventsResponse(
                items,
                pageResult.getNumber(),
                pageResult.getSize(),
                pageResult.getTotalElements(),
                pageResult.getTotalPages(),
                pageResult.hasNext()
        );
    }
}
