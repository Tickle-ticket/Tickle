package com.ssafy.tickle.favorite.presentation;

import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.favorite.presentation.dto.FavoriteCreateResponse;
import com.ssafy.tickle.favorite.presentation.dto.FavoriteEventsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;

/**
 * 공연 찜 API 문서 인터페이스입니다.
 */
@Tag(name = "Favorite", description = "공연 찜 API")
public interface FavoriteApiDoc {

    @Operation(summary = "공연 찜 등록", description = "사용자가 공연을 찜합니다.")
    @ApiResponse(responseCode = "201", description = "공연 찜 등록 성공")
    @ApiResponse(responseCode = "400", description = "잘못된 요청", content = @Content(schema = @Schema(implementation = BaseResponse.class)))
    @ApiResponse(responseCode = "404", description = "사용자 또는 공연을 찾을 수 없음", content = @Content(schema = @Schema(implementation = BaseResponse.class)))
    @ApiResponse(responseCode = "409", description = "이미 찜한 공연", content = @Content(schema = @Schema(implementation = BaseResponse.class)))
    ResponseEntity<BaseResponse<FavoriteCreateResponse>> createFavorite(
            @Parameter(description = "공연 식별자", required = true) Long eventId,
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1") @UserId Long userId
    );

    @Operation(summary = "공연 찜 해제", description = "사용자가 공연 찜을 해제합니다.")
    @ApiResponse(responseCode = "200", description = "공연 찜 해제 성공")
    @ApiResponse(responseCode = "400", description = "잘못된 요청", content = @Content(schema = @Schema(implementation = BaseResponse.class)))
    @ApiResponse(responseCode = "404", description = "찜한 공연을 찾을 수 없음", content = @Content(schema = @Schema(implementation = BaseResponse.class)))
    ResponseEntity<BaseResponse<Void>> deleteFavorite(
            @Parameter(description = "공연 식별자", required = true) Long eventId,
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1") @UserId Long userId
    );

    @Operation(summary = "내 찜 공연 목록 조회", description = "사용자가 찜한 공연 목록을 최신순으로 조회합니다.")
    @ApiResponse(responseCode = "200", description = "내 찜 공연 목록 조회 성공")
    @ApiResponse(responseCode = "400", description = "잘못된 요청", content = @Content(schema = @Schema(implementation = BaseResponse.class)))
    @ApiResponse(responseCode = "404", description = "사용자를 찾을 수 없음", content = @Content(schema = @Schema(implementation = BaseResponse.class)))
    ResponseEntity<BaseResponse<FavoriteEventsResponse>> getFavoriteEvents(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1") @UserId Long userId,
            @Parameter(description = "페이지 번호", example = "0") int page,
            @Parameter(description = "페이지 크기", example = "20") int size
    );
}
