package com.ssafy.tickle.event.presentation.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * 이벤트 목록 응답 DTO입니다.
 *
 * @param items 이벤트 목록
 * @param page 현재 페이지 번호
 * @param size 페이지 크기
 * @param totalElements 전체 데이터 수
 * @param totalPages 전체 페이지 수
 * @param hasNext 다음 페이지 존재 여부
 */
public record EventListResponse(
        List<EventSummaryResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext
) {

    /**
     * 페이지 결과를 이벤트 목록 응답으로 변환합니다.
     *
     * @param pageResult 이벤트 페이지
     * @param items 이벤트 목록 아이템
     * @return 이벤트 목록 응답
     */
    public static EventListResponse from(Page<?> pageResult, List<EventSummaryResponse> items) {
        return new EventListResponse(
                items,
                pageResult.getNumber(),
                pageResult.getSize(),
                pageResult.getTotalElements(),
                pageResult.getTotalPages(),
                pageResult.hasNext()
        );
    }
}
