package com.ssafy.tickle.blacklist.application;

import com.ssafy.tickle.blacklist.domain.Blacklist;
import com.ssafy.tickle.blacklist.domain.Blacklist.Reason;
import com.ssafy.tickle.blacklist.infrastructure.persistence.BlacklistRepository;
import com.ssafy.tickle.blacklist.presentation.dto.BlacklistDashboardResponse;
import com.ssafy.tickle.user.infrastructure.persistence.UserAccessLogRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminBlacklistDashboardServiceTest {

    @InjectMocks
    private AdminBlacklistDashboardService adminBlacklistDashboardService;

    @Mock
    private BlacklistRepository blacklistRepository;

    @Mock
    private UserAccessLogRepository userAccessLogRepository;

    @Test
    @DisplayName("봇 탐지 대시보드 데이터를 성공적으로 조회한다")
    void getDashboard_Success() {
        // given
        when(userAccessLogRepository.countByCreatedAtBetween(any(), any())).thenReturn(1000L);

        ZoneId KST = ZoneId.of("Asia/Seoul");
        ZonedDateTime now = ZonedDateTime.now(KST);
        // 고정 시간대로 테스트하려면 복잡하므로 현재 시간을 기준으로 생성하되, 차트 그룹핑 로직을 검증
        Instant instant = now.toInstant();
        
        Blacklist b1 = mock(Blacklist.class);
        when(b1.getCreatedAt()).thenReturn(instant);
        when(b1.getReason()).thenReturn(Reason.MACRO_DETECTED_FE);

        Blacklist b2 = mock(Blacklist.class);
        when(b2.getCreatedAt()).thenReturn(instant);
        when(b2.getReason()).thenReturn(Reason.BOT_DETECTED);

        when(blacklistRepository.findByCreatedAtBetweenOrderByCreatedAtAsc(any(), any())).thenReturn(List.of(b1, b2));

        // when
        BlacklistDashboardResponse response = adminBlacklistDashboardService.getDashboard();

        // then
        assertThat(response.totalConnectionsToday()).isEqualTo(1000L);
        assertThat(response.botDetectionCount()).isEqualTo(2L);
        assertThat(response.blockRate()).isEqualTo(100.0);
        assertThat(response.blockedCount()).isEqualTo(2L);
        
        // 차트 데이터 검증: 현재 짝수 시간대에 누적값이 들어가야 함
        long macroTotal = response.chartData().stream().mapToLong(BlacklistDashboardResponse.BlacklistChartData::macroCount).sum();
        long bypassTotal = response.chartData().stream().mapToLong(BlacklistDashboardResponse.BlacklistChartData::bypassCount).sum();
        long cumulativeMax = response.chartData().stream().mapToLong(BlacklistDashboardResponse.BlacklistChartData::cumulativeDetected).max().orElse(0);

        assertThat(macroTotal).isEqualTo(1L);
        assertThat(bypassTotal).isEqualTo(1L);
        assertThat(cumulativeMax).isEqualTo(2L);
    }
}
