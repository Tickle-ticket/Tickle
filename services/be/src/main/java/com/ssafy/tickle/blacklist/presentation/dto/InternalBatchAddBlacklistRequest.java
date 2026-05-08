package com.ssafy.tickle.blacklist.presentation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * AI 서비스에서 블랙리스트를 일괄 등록할 때 사용하는 내부 배치 요청 DTO입니다.
 *
 * @param items 블랙리스트 단건 등록 요청 목록 (비어 있으면 안 됨)
 */
public record InternalBatchAddBlacklistRequest(
        @NotEmpty @Valid List<InternalAddBlacklistRequest> items
) {
}
