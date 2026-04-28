package com.ssafy.tickle.user.presentation;

import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.user.application.InternalUserService;
import com.ssafy.tickle.user.presentation.dto.CreateUserRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 내부 사용자 생성 API 컨트롤러입니다.
 *
 * <p>Auth 서버 전용 내부 엔드포인트로, X-Internal-Secret 헤더는
 * InternalSecretInterceptor에서 사전 검증됩니다.</p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/internal/v1/users")
public class InternalUserController implements InternalUserApiDoc {

    private final InternalUserService internalUserService;

    /**
     * Auth 서버의 회원가입 요청으로 tickle_core.users 레코드를 생성합니다.
     *
     * @param secret  X-Internal-Secret 헤더 (인터셉터에서 검증 완료)
     * @param request 사용자 생성 요청 정보
     * @return 201 Created
     */
    @PostMapping
    @Override
    public ResponseEntity<BaseResponse<Void>> createUser(
            @RequestHeader("X-Internal-Secret") String secret,
            @Valid @RequestBody CreateUserRequest request
    ) {
        internalUserService.createUser(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(BaseResponse.success(SuccessCode.CREATED));
    }
}
