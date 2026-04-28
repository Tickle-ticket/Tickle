package com.ssafy.tickle.category.application;

import com.ssafy.tickle.category.presentation.dto.CategoryListItemResponse;
import com.ssafy.tickle.category.presentation.dto.CategoryListResponse;
import com.ssafy.tickle.event.infrastructure.persistence.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 범용 카테고리 목록 조회를 담당합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryListService {

    private final CategoryRepository categoryRepository;

    /**
     * 카테고리 목록을 조회합니다.
     *
     * @return 카테고리 목록 응답 DTO
     */
    public CategoryListResponse getCategories() {
        return CategoryListResponse.from(
                categoryRepository.findAllOrderByCategoryName().stream()
                        .map(CategoryListItemResponse::from)
                        .toList()
        );
    }
}
