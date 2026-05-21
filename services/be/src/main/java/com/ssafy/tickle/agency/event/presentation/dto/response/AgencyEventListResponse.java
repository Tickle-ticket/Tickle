package com.ssafy.tickle.agency.event.presentation.dto.response;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * 기획사 공연 목록 응답입니다.
 *
 * @param items 공연 목록
 * @param page 현재 페이지 번호
 * @param size 페이지 크기
 * @param totalElements 전체 데이터 수
 * @param totalPages 전체 페이지 수
 * @param hasNext 다음 페이지 존재 여부
 */
public record AgencyEventListResponse(
        List<AgencyEventListItemResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext
) {

    /**
     * 페이지 결과를 공연 목록 응답으로 변환합니다.
     *
     * @param pageResult 공연 페이지
     * @param items 공연 목록
     * @return 공연 목록 응답
     */
    public static AgencyEventListResponse from(
            Page<?> pageResult,
            List<AgencyEventListItemResponse> items
    ) {
        return new AgencyEventListResponse(
                items,
                pageResult.getNumber(),
                pageResult.getSize(),
                pageResult.getTotalElements(),
                pageResult.getTotalPages(),
                pageResult.hasNext()
        );
    }
}
