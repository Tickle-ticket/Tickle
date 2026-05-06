package com.ssafy.tickle.blacklist.application;

import com.ssafy.tickle.blacklist.domain.Blacklist;
import com.ssafy.tickle.blacklist.domain.BlacklistErrorCode;
import com.ssafy.tickle.blacklist.infrastructure.persistence.BlacklistRepository;
import com.ssafy.tickle.blacklist.presentation.dto.AddBlacklistRequest;
import com.ssafy.tickle.blacklist.presentation.dto.BlacklistPageResponse;
import com.ssafy.tickle.blacklist.presentation.dto.InternalAddBlacklistRequest;
import com.ssafy.tickle.blacklist.presentation.dto.InternalBatchAddBlacklistRequest;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;

/**
 * BlacklistService 단위 테스트입니다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("BlacklistService 단위 테스트")
class BlacklistServiceTest {

    @InjectMocks
    private BlacklistService blacklistService;

    @Mock
    private BlacklistRepository blacklistRepository;

    private static final Long ADMIN_ID = 1L;
    private static final Long USER_ID = 100L;
    private static final Long BLACKLIST_ID = 10L;

    private Blacklist createBlacklist(Long userId, Blacklist.Reason reason) {
        return Blacklist.builder()
                .userId(userId)
                .reason(reason)
                .detail("테스트 사유")
                .blockedBy(ADMIN_ID)
                .build();
    }

    // ── getBlacklist ──────────────────────────────────────────────

    @Nested
    @DisplayName("블랙리스트 목록 조회 (getBlacklist)")
    class GetBlacklistTest {

        @Test
        @DisplayName("블랙리스트 목록을 페이지네이션하여 반환한다")
        void getBlacklist_success_returnsPaginatedList() {
            Blacklist entry = createBlacklist(USER_ID, Blacklist.Reason.MANUAL_BLOCK);
            Page<Blacklist> page = new PageImpl<>(List.of(entry));
            given(blacklistRepository.findAll(any(Pageable.class))).willReturn(page);

            BlacklistPageResponse response = blacklistService.getBlacklist(0, 20);

            assertThat(response.items()).hasSize(1);
            assertThat(response.items().get(0).userId()).isEqualTo(USER_ID);
            assertThat(response.totalElements()).isEqualTo(1);
        }

        @Test
        @DisplayName("블랙리스트가 비어있으면 빈 목록을 반환한다")
        void getBlacklist_empty_returnsEmptyList() {
            given(blacklistRepository.findAll(any(Pageable.class))).willReturn(Page.empty());

            BlacklistPageResponse response = blacklistService.getBlacklist(0, 20);

            assertThat(response.items()).isEmpty();
            assertThat(response.totalElements()).isZero();
        }
    }

    // ── addBlacklist ──────────────────────────────────────────────

    @Nested
    @DisplayName("블랙리스트 수동 등록 (addBlacklist)")
    class AddBlacklistTest {

        @Test
        @DisplayName("정상 요청이면 블랙리스트에 등록하고 blockedBy에 adminUserId가 설정된다")
        void addBlacklist_success_savesWithAdminId() {
            AddBlacklistRequest request = new AddBlacklistRequest(USER_ID, "MANUAL_BLOCK", "매크로 의심");
            given(blacklistRepository.existsByUserId(USER_ID)).willReturn(false);
            ArgumentCaptor<Blacklist> captor = ArgumentCaptor.forClass(Blacklist.class);
            given(blacklistRepository.save(captor.capture())).willAnswer(inv -> inv.getArgument(0));

            blacklistService.addBlacklist(ADMIN_ID, request);

            Blacklist saved = captor.getValue();
            assertThat(saved.getUserId()).isEqualTo(USER_ID);
            assertThat(saved.getReason()).isEqualTo(Blacklist.Reason.MANUAL_BLOCK);
            assertThat(saved.getBlockedBy()).isEqualTo(ADMIN_ID);
            assertThat(saved.getDetail()).isEqualTo("매크로 의심");
        }

        @Test
        @DisplayName("이미 블랙리스트에 있는 사용자면 ALREADY_BLACKLISTED 예외가 발생한다")
        void addBlacklist_alreadyBlacklisted_throwsException() {
            AddBlacklistRequest request = new AddBlacklistRequest(USER_ID, "MANUAL_BLOCK", null);
            given(blacklistRepository.existsByUserId(USER_ID)).willReturn(true);

            assertThatThrownBy(() -> blacklistService.addBlacklist(ADMIN_ID, request))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(BlacklistErrorCode.ALREADY_BLACKLISTED);

            then(blacklistRepository).should(never()).save(any());
        }

        @Test
        @DisplayName("유효하지 않은 reason이면 INVALID_REQUEST 예외가 발생한다")
        void addBlacklist_invalidReason_throwsInvalidRequest() {
            AddBlacklistRequest request = new AddBlacklistRequest(USER_ID, "UNKNOWN_REASON", null);
            given(blacklistRepository.existsByUserId(USER_ID)).willReturn(false);

            assertThatThrownBy(() -> blacklistService.addBlacklist(ADMIN_ID, request))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.INVALID_REQUEST);
        }
    }

    // ── removeBlacklist ───────────────────────────────────────────

    @Nested
    @DisplayName("블랙리스트 해제 (removeBlacklist)")
    class RemoveBlacklistTest {

        @Test
        @DisplayName("블랙리스트 항목이 존재하면 삭제한다")
        void removeBlacklist_success_deletes() {
            Blacklist entry = createBlacklist(USER_ID, Blacklist.Reason.MANUAL_BLOCK);
            given(blacklistRepository.findById(BLACKLIST_ID)).willReturn(Optional.of(entry));

            blacklistService.removeBlacklist(BLACKLIST_ID);

            then(blacklistRepository).should(times(1)).delete(entry);
        }

        @Test
        @DisplayName("블랙리스트 항목이 없으면 BLACKLIST_NOT_FOUND 예외가 발생한다")
        void removeBlacklist_notFound_throwsException() {
            given(blacklistRepository.findById(BLACKLIST_ID)).willReturn(Optional.empty());

            assertThatThrownBy(() -> blacklistService.removeBlacklist(BLACKLIST_ID))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(BlacklistErrorCode.BLACKLIST_NOT_FOUND);
        }
    }

    // ── addBlacklistInternal ──────────────────────────────────────

    @Nested
    @DisplayName("내부 블랙리스트 단건 등록 (addBlacklistInternal)")
    class AddBlacklistInternalTest {

        @Test
        @DisplayName("정상 요청이면 blockedBy=null로 저장된다")
        void addBlacklistInternal_success_savesWithNullBlockedBy() {
            InternalAddBlacklistRequest request = new InternalAddBlacklistRequest(USER_ID, "BOT_DETECTED", "AI 탐지", null);
            given(blacklistRepository.existsByUserId(USER_ID)).willReturn(false);
            ArgumentCaptor<Blacklist> captor = ArgumentCaptor.forClass(Blacklist.class);
            given(blacklistRepository.save(captor.capture())).willAnswer(inv -> inv.getArgument(0));

            blacklistService.addBlacklistInternal(request);

            Blacklist saved = captor.getValue();
            assertThat(saved.getBlockedBy()).isNull();
            assertThat(saved.getReason()).isEqualTo(Blacklist.Reason.BOT_DETECTED);
        }

        @Test
        @DisplayName("이미 블랙리스트에 있으면 중복 등록하지 않는다 (멱등성)")
        void addBlacklistInternal_alreadyBlacklisted_skips() {
            InternalAddBlacklistRequest request = new InternalAddBlacklistRequest(USER_ID, "BOT_DETECTED", null, null);
            given(blacklistRepository.existsByUserId(USER_ID)).willReturn(true);

            blacklistService.addBlacklistInternal(request);

            then(blacklistRepository).should(never()).save(any());
        }

        @Test
        @DisplayName("모든 reason 타입을 정상 등록한다")
        void addBlacklistInternal_allReasonTypes_succeed() {
            for (Blacklist.Reason reason : Blacklist.Reason.values()) {
                given(blacklistRepository.existsByUserId(USER_ID)).willReturn(false);
                given(blacklistRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

                InternalAddBlacklistRequest request = new InternalAddBlacklistRequest(USER_ID, reason.name(), null, null);
                blacklistService.addBlacklistInternal(request);
            }

            then(blacklistRepository).should(times(Blacklist.Reason.values().length)).save(any());
        }
    }

    // ── addBlacklistBatch ─────────────────────────────────────────

    @Nested
    @DisplayName("내부 블랙리스트 배치 등록 (addBlacklistBatch)")
    class AddBlacklistBatchTest {

        @Test
        @DisplayName("배치 요청의 모든 항목을 등록한다")
        void addBlacklistBatch_success_savesAll() {
            InternalBatchAddBlacklistRequest request = new InternalBatchAddBlacklistRequest(List.of(
                    new InternalAddBlacklistRequest(101L, "BOT_DETECTED", null, null),
                    new InternalAddBlacklistRequest(102L, "IP_RATE_LIMIT", null, null),
                    new InternalAddBlacklistRequest(103L, "MACRO_DETECTED_FE", null, null)
            ));
            given(blacklistRepository.existsByUserId(any())).willReturn(false);
            given(blacklistRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

            blacklistService.addBlacklistBatch(request);

            then(blacklistRepository).should(times(3)).save(any());
        }

        @Test
        @DisplayName("배치 중 이미 등록된 항목은 건너뛰고 나머지는 정상 등록된다")
        void addBlacklistBatch_partialDuplicate_skipsExisting() {
            InternalBatchAddBlacklistRequest request = new InternalBatchAddBlacklistRequest(List.of(
                    new InternalAddBlacklistRequest(101L, "BOT_DETECTED", null, null),
                    new InternalAddBlacklistRequest(102L, "BOT_DETECTED", null, null)
            ));
            given(blacklistRepository.existsByUserId(101L)).willReturn(true);
            given(blacklistRepository.existsByUserId(102L)).willReturn(false);
            given(blacklistRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

            blacklistService.addBlacklistBatch(request);

            then(blacklistRepository).should(times(1)).save(any());
        }
    }
}
