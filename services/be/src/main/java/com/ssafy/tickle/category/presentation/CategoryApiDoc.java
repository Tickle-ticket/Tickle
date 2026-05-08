package com.ssafy.tickle.category.presentation;

import com.ssafy.tickle.category.presentation.dto.CategoryListResponse;
import com.ssafy.tickle.common.response.BaseResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;

/**
 * 카테고리 목록 API 문서 인터페이스입니다.
 */
@Tag(name = "Category", description = "카테고리 목록 조회 API")
public interface CategoryApiDoc {

    /**
     * 카테고리 목록을 조회합니다.
     *
     * @return 카테고리 목록 응답
     */
    @Operation(
            summary = "카테고리 목록 조회",
            description = "공연 분류에 사용할 카테고리의 ID와 이름만 조회합니다."
    )
    @ApiResponse(responseCode = "200", description = "카테고리 목록 조회 성공")
    ResponseEntity<BaseResponse<CategoryListResponse>> getCategories();
}
