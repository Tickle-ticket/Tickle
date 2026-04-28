package com.ssafy.tickle.category.presentation.dto;

import com.ssafy.tickle.event.domain.Category;

/**
 * 카테고리 목록 아이템 응답입니다.
 *
 * @param categoryId 카테고리 식별자
 * @param categoryName 카테고리명
 */
public record CategoryListItemResponse(
        Long categoryId,
        String categoryName
) {

    /**
     * 카테고리 엔티티를 목록 아이템 응답으로 변환합니다.
     *
     * @param category 카테고리 엔티티
     * @return 카테고리 목록 아이템 응답
     */
    public static CategoryListItemResponse from(Category category) {
        return new CategoryListItemResponse(category.getId(), category.getCategoryName());
    }
}
