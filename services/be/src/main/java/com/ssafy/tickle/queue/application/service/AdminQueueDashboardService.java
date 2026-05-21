package com.ssafy.tickle.queue.application.service;

import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.queue.domain.QueueHistory;
import com.ssafy.tickle.queue.infrastructure.cache.store.QueueStatusStore;
import com.ssafy.tickle.queue.infrastructure.persistence.QueueHistoryRepository;
import com.ssafy.tickle.queue.presentation.dto.QueueDashboardResponse;
import com.ssafy.tickle.queue.presentation.dto.QueueEventRankResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminQueueDashboardService {

    private final QueueHistoryRepository queueHistoryRepository;
    private final EventRepository eventRepository;
    private final QueueStatusStore queueStatusStore;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.of("Asia/Seoul"));

    /**
     * 특정 공연의 1시간 단위 대기열 대시보드 데이터를 조회합니다.
     */
    public QueueDashboardResponse getEventDashboard(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("이벤트를 찾을 수 없습니다."));

        Instant now = Instant.now();
        Instant oneHourAgo = now.minus(1, ChronoUnit.HOURS);

        // 1. 최근 1시간 히스토리 데이터 조회
        List<QueueHistory> histories = queueHistoryRepository.findByEventIdAndRecordedAtBetweenOrderByRecordedAtAsc(eventId, oneHourAgo, now);

        // 2. 현재 활성 상태 통계 조회 (Redis)
        long currentWaiting = queueStatusStore.countWaiting(eventId);
        long recentAdmitted = queueStatusStore.countRecentAdmissions(eventId, now.minus(1, ChronoUnit.MINUTES), now);

        // 3. 차트 및 요약 지표 계산
        long totalInflowLastHour = 0;
        long peakWaiting = currentWaiting;
        List<QueueDashboardResponse.QueueChartData> chartDataList = new ArrayList<>();

        if (!histories.isEmpty()) {
            QueueHistory first = histories.get(0);
            QueueHistory last = histories.get(histories.size() - 1);
            
            for (int i = 0; i < histories.size(); i++) {
                QueueHistory h = histories.get(i);
                peakWaiting = Math.max(peakWaiting, h.getTotalWaiting());
                
                // inflow 유추 (이전 5분간 들어온 사람 = 현재대기 - 이전대기 + 5분간입장)
                long inflow = 0;
                if (i > 0) {
                    QueueHistory prev = histories.get(i - 1);
                    inflow = Math.max(0, h.getTotalWaiting() - prev.getTotalWaiting() + h.getAdmittedCount());
                }
                totalInflowLastHour += inflow;

                chartDataList.add(new QueueDashboardResponse.QueueChartData(
                        TIME_FORMATTER.format(h.getRecordedAt()),
                        h.getTotalWaiting(),
                        inflow,
                        h.getAdmittedCount(),
                        h.getAverageWaitSeconds() / 60
                ));
            }
        }

        // Mock 데이터용 임시 계산 (나중에 구체화 가능)
        long waitingDifference = chartDataList.isEmpty() ? 0 : currentWaiting - chartDataList.get(0).waitCount();
        long peakTarget = 2400; // 목표치 하드코딩
        long admissionsDifference = 70; // 하드코딩
        long throughputPerMinute = 210; // 하드코딩

        long expectedWaitMinutes = currentWaiting == 0 ? 0 : (currentWaiting / Math.max(1, recentAdmitted));

        return new QueueDashboardResponse(
                eventId,
                event.getTitle(),
                totalInflowLastHour,
                currentWaiting,
                waitingDifference,
                peakWaiting,
                peakTarget,
                recentAdmitted,
                admissionsDifference,
                expectedWaitMinutes,
                throughputPerMinute,
                chartDataList
        );
    }

    /**
     * 전체 공연 중 실시간 대기열이 가장 많은 공연 Top 리스트를 반환합니다.
     */
    public List<QueueEventRankResponse> getTopWaitingEvents() {
        Set<Long> activeEventIds = queueStatusStore.findWaitingEventIds();
        if (activeEventIds.isEmpty()) return List.of();

        List<Event> events = eventRepository.findAllById(activeEventIds);
        java.util.Map<Long, Event> eventMap = events.stream().collect(Collectors.toMap(Event::getId, e -> e));

        List<QueueEventRankResponse> results = new ArrayList<>();
        for (Long eventId : activeEventIds) {
            long waitCount = queueStatusStore.countWaiting(eventId);
            if (waitCount > 0 && eventMap.containsKey(eventId)) {
                Event event = eventMap.get(eventId);
                long recentAdmitted = queueStatusStore.countRecentAdmissions(eventId, Instant.now().minus(1, ChronoUnit.MINUTES), Instant.now());
                long expectedWaitMinutes = waitCount == 0 ? 0 : (waitCount / Math.max(1, recentAdmitted));
                
                results.add(new QueueEventRankResponse(
                        0, // rank는 정렬 후 부여
                        eventId,
                        event.getTitle(),
                        "오늘", // 날짜 포맷 필요
                        waitCount,
                        expectedWaitMinutes
                ));
            }
        }

        // 대기자 수 내림차순 정렬 및 순위 부여
        results.sort(Comparator.comparingLong(QueueEventRankResponse::waitCount).reversed());
        
        List<QueueEventRankResponse> rankedList = new ArrayList<>();
        for (int i = 0; i < results.size(); i++) {
            QueueEventRankResponse r = results.get(i);
            rankedList.add(new QueueEventRankResponse(i + 1, r.eventId(), r.eventName(), r.date(), r.waitCount(), r.expectedWaitMinutes()));
        }

        return rankedList;
    }
}
