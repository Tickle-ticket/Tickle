package com.ssafy.tickle.queue.application.scheduler;

import com.ssafy.tickle.queue.application.service.QueueStatusService;
import com.ssafy.tickle.queue.domain.QueueHistory;
import com.ssafy.tickle.queue.infrastructure.cache.store.QueueStatusStore;
import com.ssafy.tickle.queue.infrastructure.persistence.QueueHistoryRepository;
import com.ssafy.tickle.queue.presentation.dto.QueueStatsResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.Set;

/**
 * 5분 단위로 활성화된 대기열의 상태를 DB에 스냅샷으로 저장하는 스케줄러입니다.
 * 어드민 대시보드 그래프 제공을 목적으로 합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class QueueHistorySnapshotScheduler {

    private final QueueStatusStore queueStatusStore;
    private final QueueStatusService queueStatusService;
    private final QueueHistoryRepository queueHistoryRepository;

    // 5분마다 실행 (0, 5, 10, 15... 분)
    @Scheduled(cron = "0 0/5 * * * *")
    @Transactional
    public void snapshotQueueStatus() {
        log.info("[QueueHistorySnapshot] 5분 단위 대기열 통계 스냅샷 저장을 시작합니다.");
        Instant now = Instant.now();
        Instant fiveMinsAgo = now.minus(5, ChronoUnit.MINUTES);

        // 현재 WAITING 또는 ADMITTED 상태인 사용자가 있는 모든 eventId 조회
        Set<Long> activeEventIds = new HashSet<>();
        activeEventIds.addAll(queueStatusStore.findWaitingEventIds());
        activeEventIds.addAll(queueStatusStore.findAdmittedEventIds());

        if (activeEventIds.isEmpty()) {
            log.info("[QueueHistorySnapshot] 활성화된 대기열이 없습니다.");
            return;
        }

        for (Long eventId : activeEventIds) {
            try {
                // 현재 상태 통계 조회
                QueueStatsResponse stats = queueStatusService.getQueueStats(eventId);
                
                // 최근 5분간 입장 처리된 수
                long recentAdmitted = queueStatusStore.countRecentAdmissions(eventId, fiveMinsAgo, now);

                // inflowCount는 프론트엔드로 전달할 때 (현재 대기 - 5분전 대기 + 분당입장)으로 계산하거나, 
                // 임시로 0으로 기록하고 나중에 보정할 수 있습니다.
                // 여기서는 대시보드 요구사항인 "최근 5분 유입량"을 유추하기 위해 대략적인 값을 기록합니다.
                // (더 정확한 계산을 위해서는 이전 QueueHistory를 조회해야 함)
                
                QueueHistory history = QueueHistory.builder()
                        .eventId(eventId)
                        .totalWaiting(stats.totalWaiting())
                        .processingCount(stats.processingCount())
                        .averageWaitSeconds(stats.averageWaitSeconds())
                        .inflowCount(0L) // 추후 서비스단에서 이전 데이터와 비교하여 동적 계산 권장
                        .admittedCount(recentAdmitted)
                        .recordedAt(now)
                        .build();

                queueHistoryRepository.save(history);
                log.debug("[QueueHistorySnapshot] eventId: {}, waiting: {}, admitted: {}", eventId, stats.totalWaiting(), recentAdmitted);
            } catch (Exception e) {
                log.error("[QueueHistorySnapshot] eventId: {} 스냅샷 저장 실패", eventId, e);
            }
        }
        log.info("[QueueHistorySnapshot] 총 {}개 공연의 스냅샷 저장 완료", activeEventIds.size());
    }
}
