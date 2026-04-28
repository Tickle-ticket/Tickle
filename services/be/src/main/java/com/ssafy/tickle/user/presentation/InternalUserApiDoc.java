package com.ssafy.tickle.user.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.user.presentation.dto.CreateUserRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

/**
 * 내부 사용자 생성 API Swagger 문서 인터페이스입니다.
 *
 * <p>Auth 서버에서만 호출하는 내부 전용 엔드포인트입니다.
 * X-Internal-Secret 헤더를 통해 접근 제어합니다.</p>
 */
@Tag(name = "Internal User API", description = "Auth 서버 전용 내부 사용자 생성 API")
public interface InternalUserApiDoc {

    @Operation(
            summary = "내부 사용자 생성",
            description = """
                    Auth 서버의 회원가입 완료 후 tickle_core.users 레코드를 생성합니다.
                    
                    - 호출 주체: Auth 서버 (내부 HTTP 통신)
                    - 인증: X-Internal-Secret 헤더 필수
                    - userId는 tickle_auth.users.id와 동일합니다.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "사용자 생성 성공"),
            @ApiResponse(responseCode = "400", description = "잘못된 입력값"),
            @ApiResponse(responseCode = "403", description = "X-Internal-Secret 불일치"),
            @ApiResponse(responseCode = "409", description = "이미 존재하는 사용자"),
            @ApiResponse(responseCode = "500", description = "서버 내부 오류")
    })
    ResponseEntity<BaseResponse<Void>> createUser(
            @Parameter(description = "내부 통신 시크릿 키", required = true)
            @RequestHeader("X-Internal-Secret") String secret,

            @Valid @RequestBody CreateUserRequest request
    );
}
