package com.ssafy.tickle.category.presentation;

import com.ssafy.tickle.category.application.CategoryListService;
import com.ssafy.tickle.category.presentation.dto.CategoryListResponse;
import com.ssafy.tickle.common.response.BaseResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 범용 카테고리 조회 API를 제공합니다.
 */
@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
public class CategoryController implements CategoryApiDoc {

    private final CategoryListService categoryListService;

    /**
     * 카테고리 목록을 조회합니다.
     *
     * @return 카테고리 목록 응답
     */
    @Override
    @GetMapping
    public ResponseEntity<BaseResponse<CategoryListResponse>> getCategories() {
        return ResponseEntity.ok(BaseResponse.success(categoryListService.getCategories()));
    }
}
