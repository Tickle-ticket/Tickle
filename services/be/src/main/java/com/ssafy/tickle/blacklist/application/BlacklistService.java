package com.ssafy.tickle.blacklist.application;

import com.ssafy.tickle.blacklist.domain.Blacklist;
import com.ssafy.tickle.blacklist.domain.BlacklistErrorCode;
import com.ssafy.tickle.blacklist.infrastructure.persistence.BlacklistRepository;
import com.ssafy.tickle.blacklist.presentation.dto.AddBlacklistRequest;
import com.ssafy.tickle.blacklist.presentation.dto.BlacklistPageResponse;
import com.ssafy.tickle.blacklist.presentation.dto.BlacklistResponse;
import com.ssafy.tickle.blacklist.presentation.dto.InternalAddBlacklistRequest;
import com.ssafy.tickle.blacklist.presentation.dto.InternalBatchAddBlacklistRequest;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 블랙리스트 관련 비즈니스 로직을 처리하는 서비스 클래스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BlacklistService {

    private final BlacklistRepository blacklistRepository;

    /**
     * 블랙리스트 전체 목록을 페이지네이션하여 조회합니다.
     *
     * @param page 페이지 번호 (0-based)
     * @param size 페이지 크기
     * @return 블랙리스트 페이지 응답
     */
    public BlacklistPageResponse getBlacklist(int page, int size) {
        Page<Blacklist> blacklistPage = blacklistRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        List<BlacklistResponse> items = blacklistPage.getContent().stream()
                .map(BlacklistResponse::from)
                .toList();
        return BlacklistPageResponse.from(blacklistPage, items);
    }

    /**
     * 관리자가 수동으로 블랙리스트에 사용자를 등록합니다.
     *
     * <p>이미 블랙리스트에 등록된 사용자라면 {@code ALREADY_BLACKLISTED} 예외를 발생시킵니다.
     * reason 문자열이 유효한 {@code Blacklist.Reason} enum 이름이 아닌 경우 {@code INVALID_REQUEST} 예외를 발생시킵니다.</p>
     *
     * @param adminUserId 등록 관리자 사용자 식별자
     * @param request     블랙리스트 등록 요청
     */
    @Transactional
    public void addBlacklist(Long adminUserId, AddBlacklistRequest request) {
        if (blacklistRepository.existsByUserId(request.userId())) {
            throw new BaseException(BlacklistErrorCode.ALREADY_BLACKLISTED);
        }

        Blacklist.Reason reason = parseReason(request.reason());

        blacklistRepository.save(
                Blacklist.builder()
                        .userId(request.userId())
                        .reason(reason)
                        .detail(request.detail())
                        .blockedBy(adminUserId)
                        .ipAddress(null)
                        .botScore(null)
                        .build()
        );
    }

    /**
     * 블랙리스트 항목을 삭제합니다.
     *
     * <p>해당 ID의 블랙리스트 항목이 없으면 {@code BLACKLIST_NOT_FOUND} 예외를 발생시킵니다.</p>
     *
     * @param blacklistId 블랙리스트 항목 식별자
     */
    @Transactional
    public void removeBlacklist(Long blacklistId) {
        Blacklist blacklist = blacklistRepository.findById(blacklistId)
                .orElseThrow(() -> new BaseException(BlacklistErrorCode.BLACKLIST_NOT_FOUND));
        blacklistRepository.delete(blacklist);
    }

    /**
     * 내부 서비스(AI/FE)에서 블랙리스트를 단건 등록합니다.
     *
     * <p>이미 블랙리스트에 등록된 사용자라면 중복 등록하지 않고 조용히 건너뜁니다 (멱등성 보장).</p>
     *
     * @param request 내부 블랙리스트 단건 등록 요청
     */
    @Transactional
    public void addBlacklistInternal(InternalAddBlacklistRequest request) {
        if (blacklistRepository.existsByUserId(request.userId())) {
            // 이미 등록된 경우 멱등성 보장을 위해 조용히 건너뜀
            return;
        }

        Blacklist.Reason reason = parseReason(request.reason());

        blacklistRepository.save(
                Blacklist.builder()
                        .userId(request.userId())
                        .reason(reason)
                        .detail(request.detail())
                        .blockedBy(null)
                        .ipAddress(request.ipAddress())
                        .botScore(null)
                        .build()
        );
    }

    /**
     * AI 서버로부터 봇 판별 결과를 수신하여 블랙리스트에 등록합니다.
     *
     * <p>이미 블랙리스트에 등록된 사용자라면 중복 등록하지 않고 조용히 건너뜁니다 (멱등성 보장).</p>
     *
     * @param userId   차단 대상 사용자 식별자
     * @param botScore AI 봇 판별 확률 (0.0~1.0)
     * @param detail   판정 설명 (nullable)
     */
    @Transactional
    public void addFromAiResult(Long userId, Double botScore, String detail) {
        if (blacklistRepository.existsByUserId(userId)) {
            return;
        }

        blacklistRepository.save(
                Blacklist.builder()
                        .userId(userId)
                        .reason(Blacklist.Reason.BOT_DETECTED)
                        .detail(detail)
                        .blockedBy(null)
                        .ipAddress(null)
                        .botScore(botScore)
                        .build()
        );
    }

    /**
     * 내부 서비스(AI)에서 블랙리스트를 일괄 등록합니다.
     *
     * <p>각 항목에 대해 {@link #addBlacklistInternal(InternalAddBlacklistRequest)}를 적용합니다.
     * 이미 등록된 항목은 건너뜁니다.</p>
     *
     * @param request 내부 블랙리스트 배치 등록 요청
     */
    @Transactional
    public void addBlacklistBatch(InternalBatchAddBlacklistRequest request) {
        for (InternalAddBlacklistRequest item : request.items()) {
            addBlacklistInternal(item);
        }
    }

    /**
     * reason 문자열을 {@code Blacklist.Reason} enum으로 변환합니다.
     *
     * <p>유효하지 않은 값이면 {@code INVALID_REQUEST} 예외를 발생시킵니다.</p>
     *
     * @param reason reason 문자열
     * @return {@code Blacklist.Reason} enum 값
     */
    private Blacklist.Reason parseReason(String reason) {
        try {
            return Blacklist.Reason.valueOf(reason);
        } catch (IllegalArgumentException e) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "유효하지 않은 블랙리스트 사유입니다: " + reason);
        }
    }
}
