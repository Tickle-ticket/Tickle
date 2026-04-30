package com.ssafy.tickle.user.presentation;

import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.user.application.UserService;
import com.ssafy.tickle.user.presentation.dto.MyInfoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 사용자 조회 API를 제공하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController implements UserApiDoc {

    private final UserService userService;

    /**
     * 현재 로그인한 사용자의 정보를 조회합니다.
     *
     * @param userId 사용자 식별자 쿼리 파라미터
     * @return 내 정보 응답
     */
    @Override
    @GetMapping("/me")
    public ResponseEntity<BaseResponse<MyInfoResponse>> getMyInfo(
            @RequestParam(required = false) Long userId
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(userService.getMyInfo(userId)));
    }

    /**
     * 현재 로그인한 사용자의 프로필을 수정합니다.
     *
     * <p>multipart/form-data 형식으로 프로필 이미지 파일, 닉네임, 전화번호를 받는다.</p>
     *
     * @param userId       사용자 식별자
     * @param profileImage 프로필 이미지 파일 (선택)
     * @param nickname     닉네임 (선택)
     * @param phoneNumber  전화번호 (선택)
     * @return 수정된 내 정보 응답
     */
    @Override
    @PutMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BaseResponse<MyInfoResponse>> updateMyInfo(
            @RequestParam(required = false) Long userId,
            @RequestPart(required = false) MultipartFile profileImage,
            @RequestParam(required = false) String nickname,
            @RequestParam(required = false) String phoneNumber
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK,
                        userService.updateMyInfo(userId, profileImage, nickname, phoneNumber)));
    }

    /**
     * 현재 로그인한 사용자를 탈퇴 처리합니다.
     *
     * @param userId 사용자 식별자 쿼리 파라미터
     * @return 회원 탈퇴 응답
     */
    @Override
    @DeleteMapping("/me")
    public ResponseEntity<BaseResponse<Void>> withdrawMyInfo(
            @RequestParam(required = false) Long userId
    ) {
        userService.withdrawMyInfo(userId);

        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK, null));
    }
}
