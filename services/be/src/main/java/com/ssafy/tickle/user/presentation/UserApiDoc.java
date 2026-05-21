package com.ssafy.tickle.user.presentation;

import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.user.presentation.dto.MyInfoResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;

/**
 * 사용자 조회 API 문서 인터페이스입니다.
 */
@Tag(name = "User", description = "사용자 조회 API")
public interface UserApiDoc {

    /**
     * 내 정보 조회 API 문서 정의입니다.
     *
     * @param userId JWT에서 추출한 사용자 식별자
     * @return 내 정보 응답
     */
    @Operation(
            summary = "내 정보 조회",
            description = "JWT에서 추출한 사용자 식별자를 기준으로 현재 사용자의 정보를 조회합니다."
    )
    @ApiResponse(
            responseCode = "200",
            description = "내 정보 조회 성공"
    )
    @ApiResponse(
            responseCode = "400",
            description = "인증 토큰 누락",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    @ApiResponse(
            responseCode = "404",
            description = "사용자를 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<MyInfoResponse>> getMyInfo(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1")
            @UserId
            Long userId
    );

    /**
     * 프로필 수정 API 문서 정의입니다.
     *
     * <p>multipart/form-data 형식. profileImage는 이미지 파일, nickname/phoneNumber는 form field.</p>
     */
    @Operation(
            summary = "프로필 수정",
            description = "프로필 이미지(파일), 닉네임, 전화번호를 수정합니다. multipart/form-data 형식. 하나 이상 필수."
    )
    @ApiResponse(responseCode = "200", description = "프로필 수정 성공")
    @ApiResponse(responseCode = "400", description = "수정할 값 없음 또는 잘못된 입력",
            content = @Content(schema = @Schema(implementation = BaseResponse.class)))
    @ApiResponse(responseCode = "404", description = "사용자를 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = BaseResponse.class)))
    ResponseEntity<BaseResponse<MyInfoResponse>> updateMyInfo(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1")
            @UserId
            Long userId,
            @Parameter(description = "프로필 이미지 파일 (선택)")
            MultipartFile profileImage,
            @Parameter(description = "닉네임 (선택)")
            String nickname,
            @Parameter(description = "전화번호 (선택)")
            String phoneNumber
    );

    /**
     * 회원 탈퇴 API 문서 정의입니다.
     *
     * @param userId JWT에서 추출한 사용자 식별자
     * @return 회원 탈퇴 응답
     */
    @Operation(
            summary = "회원 탈퇴",
            description = "JWT에서 추출한 사용자 식별자를 기준으로 현재 사용자를 탈퇴 처리합니다."
    )
    @ApiResponse(
            responseCode = "200",
            description = "회원 탈퇴 성공"
    )
    @ApiResponse(
            responseCode = "400",
            description = "인증 토큰 누락",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    @ApiResponse(
            responseCode = "404",
            description = "사용자를 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<Void>> withdrawMyInfo(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1")
            @UserId
            Long userId
    );
}
