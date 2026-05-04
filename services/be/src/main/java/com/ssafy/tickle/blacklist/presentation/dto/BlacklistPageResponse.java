package com.ssafy.tickle.blacklist.presentation.dto;

import com.ssafy.tickle.blacklist.domain.Blacklist;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * 블랙리스트 목록 페이지네이션 응답 DTO입니다.
 *
 * @param items         블랙리스트 항목 목록
 * @param page          현재 페이지 번호
 * @param size          페이지 크기
 * @param totalElements 전체 항목 수
 * @param totalPages    전체 페이지 수
 * @param hasNext       다음 페이지 존재 여부
 */
public record BlacklistPageResponse(
        List<BlacklistResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext
) {

    /**
     * Spring Page 객체와 응답 DTO 목록으로 페이지네이션 응답을 생성합니다.
     *
     * @param page  Spring Page 객체 (페이지 메타 정보)
     * @param items 변환된 블랙리스트 응답 DTO 목록
     * @return 블랙리스트 페이지 응답 DTO
     */
    public static BlacklistPageResponse from(Page<Blacklist> page, List<BlacklistResponse> items) {
        return new BlacklistPageResponse(
                items,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.hasNext()
        );
    }
}
