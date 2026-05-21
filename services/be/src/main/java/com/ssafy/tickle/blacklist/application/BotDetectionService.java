package com.ssafy.tickle.blacklist.application;

import com.ssafy.tickle.blacklist.domain.Blacklist;
import com.ssafy.tickle.blacklist.infrastructure.persistence.BlacklistRepository;
import com.ssafy.tickle.blacklist.presentation.dto.BlacklistResponse;
import com.ssafy.tickle.blacklist.presentation.dto.BotDetectionStatsResponse;
import com.ssafy.tickle.blacklist.presentation.dto.BotDetectionStatsResponse.ReasonStat;
import com.ssafy.tickle.blacklist.presentation.dto.BotDetectionStatsResponse.ScoreBucket;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.springframework.data.domain.Sort.Direction.DESC;

/**
 * 봇 탐지 현황 조회 관련 비즈니스 로직을 처리하는 서비스 클래스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BotDetectionService {

    private final BlacklistRepository blacklistRepository;
    private final UserRepository userRepository;

    /**
     * 봇 탐지 현황 통계를 조회합니다.
     *
     * <p>전체 블랙리스트 수, 최근 1시간 탐지 건수, 고유 IP 수, 사유별 통계,
     * AI 봇 점수 구간 분포, 최근 등록 10건을 포함합니다.</p>
     *
     * @return 봇 탐지 현황 통계 응답
     */
    public BotDetectionStatsResponse getStats() {
        long total = blacklistRepository.count();

        // 최근 1시간 탐지 건수
        Instant oneHourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
        long recentOneHourCount = blacklistRepository.countByCreatedAtAfter(oneHourAgo);

        // 고유 IP 수 (IP_RATE_LIMIT 탐지 건)
        long blockedIpCount = blacklistRepository.countDistinctIpAddress();

        // 단일 GROUP BY 쿼리로 사유별 카운트 일괄 조회 (N+1 방지)
        Map<String, Long> reasonCountMap = blacklistRepository.countGroupByReason().stream()
                .collect(Collectors.toMap(
                        row -> ((Blacklist.Reason) row[0]).name(),
                        row -> (Long) row[1]
                ));
        List<ReasonStat> byReason = Arrays.stream(Blacklist.Reason.values())
                .map(reason -> new ReasonStat(reason.name(), reasonCountMap.getOrDefault(reason.name(), 0L)))
                .toList();

        // AI 봇 스코어 구간별 분포 (botScore IS NOT NULL인 건만)
        List<ScoreBucket> scoreDistribution = blacklistRepository.countByScoreRange().stream()
                .map(row -> new ScoreBucket((String) row[0], (Long) row[1]))
                .toList();

        List<Blacklist> recentBlacklists = blacklistRepository
                .findAll(PageRequest.of(0, 10, Sort.by(DESC, "createdAt")))
                .getContent();
        Set<Long> recentUserIds = recentBlacklists.stream()
                .map(Blacklist::getUserId).collect(Collectors.toSet());
        Map<Long, String> recentUserNameById = userRepository.findAllByIdIn(recentUserIds).stream()
                .collect(Collectors.toMap(User::getId, User::getName));
        List<BlacklistResponse> recent = recentBlacklists.stream()
                .map(b -> BlacklistResponse.of(b, recentUserNameById.get(b.getUserId())))
                .toList();

        return BotDetectionStatsResponse.from(total, recentOneHourCount, blockedIpCount, byReason, scoreDistribution, recent);
    }
}
