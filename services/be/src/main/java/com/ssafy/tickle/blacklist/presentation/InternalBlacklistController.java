package com.ssafy.tickle.blacklist.presentation;

import com.ssafy.tickle.blacklist.application.BlacklistService;
import com.ssafy.tickle.blacklist.presentation.dto.InternalAddBlacklistRequest;
import com.ssafy.tickle.blacklist.presentation.dto.InternalBatchAddBlacklistRequest;
import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * AI/FE 서비스에서 블랙리스트를 등록하는 내부 API 컨트롤러입니다.
 *
 * <p>X-Internal-Secret 헤더 검증은 InternalSecretInterceptor가 담당합니다.</p>
 */
@RestController
@RequestMapping("/internal/v1/blacklist")
@RequiredArgsConstructor
public class InternalBlacklistController {

    private final BlacklistService blacklistService;

    /**
     * 블랙리스트를 단건 등록합니다.
     *
     * <p>이미 등록된 사용자인 경우 중복 등록하지 않고 201을 반환합니다 (멱등성 보장).</p>
     *
     * @param request 내부 블랙리스트 단건 등록 요청
     * @return 201 Created 응답
     */
    @PostMapping
    public ResponseEntity<BaseResponse<Void>> addBlacklist(
            @Valid @RequestBody InternalAddBlacklistRequest request
    ) {
        blacklistService.addBlacklistInternal(request);
        return ResponseEntity
                .status(201)
                .body(BaseResponse.success(SuccessCode.CREATED, null));
    }

    /**
     * 블랙리스트를 일괄 등록합니다.
     *
     * <p>각 항목에 대해 멱등하게 처리하며, 이미 등록된 사용자는 건너뜁니다.</p>
     *
     * @param request 내부 블랙리스트 배치 등록 요청
     * @return 201 Created 응답
     */
    @PostMapping("/batch")
    public ResponseEntity<BaseResponse<Void>> addBlacklistBatch(
            @Valid @RequestBody InternalBatchAddBlacklistRequest request
    ) {
        blacklistService.addBlacklistBatch(request);
        return ResponseEntity
                .status(201)
                .body(BaseResponse.success(SuccessCode.CREATED, null));
    }
}
