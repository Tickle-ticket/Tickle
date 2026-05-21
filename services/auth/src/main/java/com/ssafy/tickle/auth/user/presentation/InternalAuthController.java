package com.ssafy.tickle.auth.user.presentation;

import com.ssafy.tickle.auth.common.exception.code.SuccessCode;
import com.ssafy.tickle.auth.common.response.BaseResponse;
import com.ssafy.tickle.auth.user.application.AuthUserInternalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 내부 서버 통신용 인증 컨트롤러입니다.
 *
 * <p>VPC 내부에서 BE 서버의 요청을 받아 사용자 삭제 등을 수행한다.</p>
 */
@RestController
@RequestMapping("/internal/v1/auth")
@RequiredArgsConstructor
public class InternalAuthController {

    private final AuthUserInternalService authUserInternalService;

    /**
     * 사용자를 인증 서버에서 삭제합니다.
     *
     * @param userId 삭제할 사용자 식별자
     * @return 성공 응답
     */
    @DeleteMapping("/users/{userId}")
    public ResponseEntity<BaseResponse<Void>> deleteUser(@PathVariable Long userId) {
        authUserInternalService.deleteUser(userId);
        return ResponseEntity.ok(BaseResponse.success(SuccessCode.OK));
    }
}
