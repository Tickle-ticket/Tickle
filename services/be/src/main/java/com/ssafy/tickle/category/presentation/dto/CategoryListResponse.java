package com.ssafy.tickle.category.presentation.dto;

import java.util.List;

/**
 * 카테고리 목록 응답입니다.
 *
 * @param categories 카테고리 목록
 */
public record CategoryListResponse(
        List<CategoryListItemResponse> categories
) {

    /**
     * 카테고리 목록 아이템들을 응답으로 감쌉니다.
     *
     * @param categories 카테고리 목록 아이템
     * @return 카테고리 목록 응답
     */
    public static CategoryListResponse from(List<CategoryListItemResponse> categories) {
        return new CategoryListResponse(categories);
    }
}
