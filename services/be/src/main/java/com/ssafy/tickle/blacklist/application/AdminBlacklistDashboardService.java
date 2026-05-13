package com.ssafy.tickle.blacklist.application;

import com.ssafy.tickle.blacklist.domain.Blacklist;
import com.ssafy.tickle.blacklist.domain.Blacklist.Reason;
import com.ssafy.tickle.blacklist.infrastructure.persistence.BlacklistRepository;
import com.ssafy.tickle.blacklist.presentation.dto.BlacklistDashboardResponse;
import com.ssafy.tickle.user.infrastructure.persistence.UserAccessLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminBlacklistDashboardService {

    private final BlacklistRepository blacklistRepository;
    private final UserAccessLogRepository userAccessLogRepository;

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter HOUR_FORMATTER = DateTimeFormatter.ofPattern("HH시");

    /**
     * 오늘 기준 봇 탐지 현황 대시보드 데이터를 조회합니다.
     */
    public BlacklistDashboardResponse getDashboard() {
        ZonedDateTime nowKst = ZonedDateTime.now(KST);
        Instant startOfDay = nowKst.toLocalDate().atStartOfDay(KST).toInstant();
        Instant now = nowKst.toInstant();

        // 1. 총 접속자 수 (오늘)
        long totalConnectionsToday = userAccessLogRepository.countByCreatedAtBetween(startOfDay, now);

        // 2. 시간대별 차트 데이터 준비
        List<Blacklist> todayBlacklists = blacklistRepository.findByCreatedAtBetweenOrderByCreatedAtAsc(startOfDay, now);
        
        long botDetectionCount = todayBlacklists.size();
        long blockedCount = botDetectionCount; // 현재 정책상 탐지되면 즉시 차단
        double blockRate = botDetectionCount > 0 ? 100.0 : 0.0; // 하드코딩 혹은 탐지/차단 분리시 로직 변경

        // 시간별 그룹핑 (0시 ~ 현재 시간까지 짝수 시간대 기준이나, 데이터 상 매 시간대 계산)
        Map<Integer, HourData> hourlyDataMap = new HashMap<>();
        for (int i = 0; i <= nowKst.getHour(); i++) {
            hourlyDataMap.put(i, new HourData());
        }

        for (Blacklist b : todayBlacklists) {
            int hour = b.getCreatedAt().atZone(KST).getHour();
            HourData hd = hourlyDataMap.computeIfAbsent(hour, k -> new HourData());
            hd.sectionBlocked++;
            
            if (b.getReason() == Reason.MACRO_DETECTED_FE) {
                hd.macroCount++;
            } else if (b.getReason() == Reason.SUSPICIOUS_PATTERN || b.getReason() == Reason.BOT_DETECTED) {
                hd.bypassCount++;
            } else {
                // IP_RATE_LIMIT 등 기타
                hd.abnormalCount++;
            }
        }

        List<BlacklistDashboardResponse.BlacklistChartData> chartDataList = new ArrayList<>();
        long cumulative = 0;
        int peakHour = 0;
        long peakDetectionCount = 0;

        // 2시간 단위(짝수시)로 묶어서 반환 (프론트엔드 목업에 맞춤)
        for (int h = 0; h <= 22; h += 2) {
            if (h > nowKst.getHour() && cumulative == botDetectionCount) {
                // 미래 시간은 0으로 채우거나 제외
                chartDataList.add(new BlacklistDashboardResponse.BlacklistChartData(
                        String.format("%02d시", h), 0, cumulative, 0, 0, 0
                ));
                continue;
            }

            // h시와 h+1시를 합침
            HourData hd1 = hourlyDataMap.getOrDefault(h, new HourData());
            HourData hd2 = hourlyDataMap.getOrDefault(h + 1, new HourData());
            
            long sectionTotal = hd1.sectionBlocked + hd2.sectionBlocked;
            cumulative += sectionTotal;

            if (sectionTotal > peakDetectionCount) {
                peakDetectionCount = sectionTotal;
                peakHour = h;
            }

            chartDataList.add(new BlacklistDashboardResponse.BlacklistChartData(
                    String.format("%02d시", h),
                    sectionTotal,
                    cumulative,
                    hd1.bypassCount + hd2.bypassCount,
                    hd1.macroCount + hd2.macroCount,
                    hd1.abnormalCount + hd2.abnormalCount
            ));
        }

        return new BlacklistDashboardResponse(
                totalConnectionsToday,
                botDetectionCount,
                blockRate,
                blockedCount,
                String.format("%02d시", peakHour),
                peakDetectionCount,
                chartDataList
        );
    }

    private static class HourData {
        long sectionBlocked = 0;
        long bypassCount = 0;
        long macroCount = 0;
        long abnormalCount = 0;
    }
}
