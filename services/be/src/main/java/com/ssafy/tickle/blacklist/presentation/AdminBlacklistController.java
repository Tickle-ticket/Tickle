package com.ssafy.tickle.blacklist.presentation;

import com.ssafy.tickle.blacklist.application.BlacklistService;
import com.ssafy.tickle.blacklist.presentation.dto.AddBlacklistRequest;
import com.ssafy.tickle.blacklist.presentation.dto.BlacklistPageResponse;
import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 어드민 블랙리스트 관리 API를 제공하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1/admin/blacklist")
@RequiredArgsConstructor
public class AdminBlacklistController implements AdminBlacklistApiDoc {

    private final BlacklistService blacklistService;
    private final com.ssafy.tickle.blacklist.application.AdminBlacklistDashboardService adminBlacklistDashboardService;

    /**
     * 블랙리스트 목록을 페이지네이션하여 조회합니다.
     *
     * @param page 페이지 번호 (기본값 0)
     * @param size 페이지 크기 (기본값 20)
     * @return 블랙리스트 페이지 응답
     */
    @Override
    @GetMapping
    public ResponseEntity<BaseResponse<BlacklistPageResponse>> getBlacklist(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(blacklistService.getBlacklist(page, size)));
    }

    /**
     * 관리자가 사용자를 블랙리스트에 수동으로 등록합니다.
     *
     * @param adminUserId 관리자 사용자 식별자 (AdminAuthInterceptor에서 검증)
     * @param request     블랙리스트 등록 요청
     * @return 빈 성공 응답
     */
    @Override
    @PostMapping
    public ResponseEntity<BaseResponse<Void>> addBlacklist(
            @RequestParam Long adminUserId,
            @Valid @RequestBody AddBlacklistRequest request
    ) {
        blacklistService.addBlacklist(adminUserId, request);
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK, null));
    }

    /**
     * 블랙리스트 항목을 삭제하여 해당 사용자의 차단을 해제합니다.
     *
     * @param blacklistId 블랙리스트 항목 식별자
     * @return 빈 성공 응답
     */
    @Override
    @DeleteMapping("/{blacklistId}")
    public ResponseEntity<BaseResponse<Void>> removeBlacklist(
            @PathVariable Long blacklistId
    ) {
        blacklistService.removeBlacklist(blacklistId);
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK, null));
    }

    @Override
    @GetMapping("/dashboard")
    public ResponseEntity<BaseResponse<com.ssafy.tickle.blacklist.presentation.dto.BlacklistDashboardResponse>> getDashboard() {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(adminBlacklistDashboardService.getDashboard()));
    }
}
