package com.ssafy.tickle.user.presentation;

import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.user.application.UserService;
import com.ssafy.tickle.user.presentation.dto.MyInfoResponse;
import com.ssafy.tickle.user.presentation.dto.UpdateMyInfoRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
     * 현재 로그인한 사용자의 정보를 부분 수정합니다.
     *
     * @param userId 사용자 식별자 쿼리 파라미터
     * @param request 수정 요청
     * @return 수정된 내 정보 응답
     */
    @Override
    @PatchMapping("/me")
    public ResponseEntity<BaseResponse<MyInfoResponse>> updateMyInfo(
            @RequestParam(required = false) Long userId,
            @Valid @RequestBody UpdateMyInfoRequest request
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK, userService.updateMyInfo(userId, request)));
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
