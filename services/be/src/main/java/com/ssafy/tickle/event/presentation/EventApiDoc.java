package com.ssafy.tickle.event.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.event.presentation.dto.CategoryRankingResponse;
import com.ssafy.tickle.event.presentation.dto.EventDetailResponse;
import com.ssafy.tickle.event.presentation.dto.EventListResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;

/**
 * 공연 조회 API 문서 인터페이스입니다.
 */
@Tag(name = "Event", description = "공연 조회 API")
public interface EventApiDoc {

    /**
     * 공연 목록 조회 / 검색 API 문서 정의입니다.
     *
     * @param keyword 제목 검색어
     * @param categoryId 카테고리 식별자
     * @param page 페이지 번호
     * @param size 페이지 크기
     * @return 공연 목록 응답
     */
    @Operation(
            summary = "공연 목록 조회 / 검색",
            description = "전체 목록, 제목 검색, 카테고리 검색 조건으로 공연 목록을 조회합니다."
    )
    @ApiResponse(
            responseCode = "200",
            description = "공연 목록 조회 / 검색 성공"
    )
    ResponseEntity<BaseResponse<EventListResponse>> getEvents(
            @Parameter(description = "공연 제목 검색어") String keyword,
            @Parameter(description = "카테고리 식별자") Long categoryId,
            @Parameter(description = "페이지 번호", example = "0") int page,
            @Parameter(description = "페이지 크기", example = "20") int size
    );

    /**
     * 랭킹 조회 API 문서 정의입니다.
     *
     * @param categoryId 카테고리 식별자(없으면 전체)
     * @return 랭킹 응답
     */
    @Operation(
            summary = "랭킹 TOP5 조회",
            description = "categoryId 기준(없으면 전체) 생성일 상위 5개 공연 랭킹을 조회합니다."
    )
    @ApiResponse(
            responseCode = "200",
            description = "랭킹 조회 성공"
    )
    ResponseEntity<BaseResponse<CategoryRankingResponse>> getRanking(
            @Parameter(description = "카테고리 식별자") Long categoryId
    );

    /**
     * 공연 상세 조회 API 문서 정의입니다.
     *
     * @param eventId 공연 식별자
     * @return 공연 상세 응답
     */
    @Operation(
            summary = "공연 상세 조회",
            description = "공연 상세 정보를 조회합니다."
    )
    @ApiResponse(
            responseCode = "200",
            description = "공연 상세 조회 성공"
    )
    @ApiResponse(responseCode = "404", description = "공연을 찾을 수 없음")
    ResponseEntity<BaseResponse<EventDetailResponse>> getEventDetail(
            @Parameter(description = "공연 식별자", required = true)
            Long eventId
    );
}
