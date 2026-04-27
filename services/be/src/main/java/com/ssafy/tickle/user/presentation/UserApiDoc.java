package com.ssafy.tickle.user.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.user.presentation.dto.MyInfoResponse;
import com.ssafy.tickle.user.presentation.dto.UpdateMyInfoRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;

/**
 * 사용자 조회 API 문서 인터페이스입니다.
 */
@Tag(name = "User", description = "사용자 조회 API")
public interface UserApiDoc {

    /**
     * 내 정보 조회 API 문서 정의입니다.
     *
     * @param userId 사용자 식별자 쿼리 파라미터
     * @return 내 정보 응답
     */
    @Operation(
            summary = "내 정보 조회",
            description = "쿼리 파라미터의 userId를 기준으로 현재 사용자의 정보를 조회합니다."
    )
    @ApiResponse(
            responseCode = "200",
            description = "내 정보 조회 성공"
    )
    @ApiResponse(
            responseCode = "400",
            description = "userId 쿼리 파라미터 누락",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    @ApiResponse(
            responseCode = "404",
            description = "사용자를 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<MyInfoResponse>> getMyInfo(
            @Parameter(description = "사용자 식별자", required = true, example = "1")
            Long userId
    );

    /**
     * 회원 정보 수정 API 문서 정의입니다.
     *
     * @param userId 사용자 식별자 쿼리 파라미터
     * @param request 수정 요청
     * @return 수정된 내 정보 응답
     */
    @Operation(
            summary = "내 정보 수정",
            description = "쿼리 파라미터의 userId를 기준으로 현재 사용자의 정보를 부분 수정합니다."
    )
    @ApiResponse(
            responseCode = "200",
            description = "내 정보 수정 성공"
    )
    @ApiResponse(
            responseCode = "400",
            description = "userId 누락 또는 잘못된 입력값",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    @ApiResponse(
            responseCode = "404",
            description = "사용자를 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<MyInfoResponse>> updateMyInfo(
            @Parameter(description = "사용자 식별자", required = true, example = "1")
            Long userId,
            UpdateMyInfoRequest request
    );

    /**
     * 회원 탈퇴 API 문서 정의입니다.
     *
     * @param userId 사용자 식별자 쿼리 파라미터
     * @return 회원 탈퇴 응답
     */
    @Operation(
            summary = "회원 탈퇴",
            description = "쿼리 파라미터의 userId를 기준으로 현재 사용자를 탈퇴 처리합니다."
    )
    @ApiResponse(
            responseCode = "200",
            description = "회원 탈퇴 성공"
    )
    @ApiResponse(
            responseCode = "400",
            description = "userId 쿼리 파라미터 누락",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    @ApiResponse(
            responseCode = "404",
            description = "사용자를 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<Void>> withdrawMyInfo(
            @Parameter(description = "사용자 식별자", required = true, example = "1")
            Long userId
    );
}
