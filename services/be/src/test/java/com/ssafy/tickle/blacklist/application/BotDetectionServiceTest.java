package com.ssafy.tickle.blacklist.application;

import com.ssafy.tickle.blacklist.domain.Blacklist;
import com.ssafy.tickle.blacklist.infrastructure.persistence.BlacklistRepository;
import com.ssafy.tickle.blacklist.presentation.dto.BotDetectionStatsResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

/**
 * BotDetectionService 단위 테스트입니다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("BotDetectionService 단위 테스트")
class BotDetectionServiceTest {

    @InjectMocks
    private BotDetectionService botDetectionService;

    @Mock
    private BlacklistRepository blacklistRepository;

    private Blacklist createBlacklist(Long userId, Blacklist.Reason reason) {
        return Blacklist.builder()
                .userId(userId)
                .reason(reason)
                .detail("테스트")
                .blockedBy(null)
                .build();
    }

    @Nested
    @DisplayName("봇 탐지 현황 조회 (getStats)")
    class GetStatsTest {

        @Test
        @DisplayName("전체 블랙리스트 수를 반환한다")
        void getStats_returnsTotalCount() {
            given(blacklistRepository.count()).willReturn(5L);
            given(blacklistRepository.countGroupByReason()).willReturn(List.of());
            given(blacklistRepository.findAll(any(Pageable.class))).willReturn(new PageImpl<>(List.of()));

            BotDetectionStatsResponse result = botDetectionService.getStats();

            assertThat(result.totalBlacklisted()).isEqualTo(5L);
        }

        @Test
        @DisplayName("사유별 통계는 모든 Reason 값을 포함하며 데이터 없으면 0을 반환한다")
        void getStats_byReason_containsAllReasons_withZeroDefault() {
            given(blacklistRepository.count()).willReturn(0L);
            given(blacklistRepository.countGroupByReason()).willReturn(List.of());
            given(blacklistRepository.findAll(any(Pageable.class))).willReturn(new PageImpl<>(List.of()));

            BotDetectionStatsResponse result = botDetectionService.getStats();

            assertThat(result.byReason()).hasSize(Blacklist.Reason.values().length);
            result.byReason().forEach(stat -> assertThat(stat.count()).isZero());
        }

        @Test
        @DisplayName("GROUP BY 쿼리 결과가 사유별 통계에 정확히 반영된다")
        void getStats_byReason_mapsGroupByResult() {
            given(blacklistRepository.count()).willReturn(3L);
            given(blacklistRepository.countGroupByReason()).willReturn(List.of(
                    new Object[]{Blacklist.Reason.BOT_DETECTED, 2L},
                    new Object[]{Blacklist.Reason.IP_RATE_LIMIT, 1L}
            ));
            given(blacklistRepository.findAll(any(Pageable.class))).willReturn(new PageImpl<>(List.of()));

            BotDetectionStatsResponse result = botDetectionService.getStats();

            assertThat(result.byReason())
                    .filteredOn(s -> s.reason().equals("BOT_DETECTED"))
                    .singleElement()
                    .satisfies(s -> assertThat(s.count()).isEqualTo(2L));
            assertThat(result.byReason())
                    .filteredOn(s -> s.reason().equals("IP_RATE_LIMIT"))
                    .singleElement()
                    .satisfies(s -> assertThat(s.count()).isEqualTo(1L));
            assertThat(result.byReason())
                    .filteredOn(s -> s.reason().equals("MANUAL_BLOCK"))
                    .singleElement()
                    .satisfies(s -> assertThat(s.count()).isZero());
        }

        @Test
        @DisplayName("최근 블랙리스트 항목을 최대 10건 반환한다")
        void getStats_recentItems_returnsUpToTen() {
            Blacklist entry = createBlacklist(100L, Blacklist.Reason.BOT_DETECTED);
            given(blacklistRepository.count()).willReturn(1L);
            given(blacklistRepository.countGroupByReason()).willReturn(List.of());
            given(blacklistRepository.findAll(any(Pageable.class)))
                    .willReturn(new PageImpl<>(List.of(entry)));

            BotDetectionStatsResponse result = botDetectionService.getStats();

            assertThat(result.recentItems()).hasSize(1);
            assertThat(result.recentItems().get(0).userId()).isEqualTo(100L);
            assertThat(result.recentItems().get(0).reason()).isEqualTo("BOT_DETECTED");
        }

        @Test
        @DisplayName("블랙리스트가 비어있으면 빈 목록과 0 카운트를 반환한다")
        void getStats_empty_returnsZeroAndEmptyList() {
            given(blacklistRepository.count()).willReturn(0L);
            given(blacklistRepository.countGroupByReason()).willReturn(List.of());
            given(blacklistRepository.findAll(any(Pageable.class))).willReturn(new PageImpl<>(List.of()));

            BotDetectionStatsResponse result = botDetectionService.getStats();

            assertThat(result.totalBlacklisted()).isZero();
            assertThat(result.recentItems()).isEmpty();
        }
    }
}
