package com.ssafy.tickle.queue.application.service;

import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.queue.domain.QueueHistory;
import com.ssafy.tickle.queue.infrastructure.cache.store.QueueStatusStore;
import com.ssafy.tickle.queue.infrastructure.persistence.QueueHistoryRepository;
import com.ssafy.tickle.queue.presentation.dto.QueueDashboardResponse;
import com.ssafy.tickle.queue.presentation.dto.QueueEventRankResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminQueueDashboardServiceTest {

    @InjectMocks
    private AdminQueueDashboardService adminQueueDashboardService;

    @Mock
    private QueueHistoryRepository queueHistoryRepository;

    @Mock
    private EventRepository eventRepository;

    @Mock
    private QueueStatusStore queueStatusStore;

    @Test
    @DisplayName("이벤트 대시보드 데이터를 성공적으로 조회한다")
    void getEventDashboard_Success() {
        // given
        Long eventId = 1L;
        Event event = mock(Event.class);
        when(event.getTitle()).thenReturn("Test Event");
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));

        QueueHistory history1 = QueueHistory.builder()
                .eventId(eventId).totalWaiting(100L).processingCount(10L)
                .averageWaitSeconds(120L).inflowCount(0L).admittedCount(5L).recordedAt(Instant.now().minusSeconds(600)).build();
        QueueHistory history2 = QueueHistory.builder()
                .eventId(eventId).totalWaiting(120L).processingCount(15L)
                .averageWaitSeconds(150L).inflowCount(0L).admittedCount(10L).recordedAt(Instant.now()).build();

        when(queueHistoryRepository.findByEventIdAndRecordedAtBetweenOrderByRecordedAtAsc(eq(eventId), any(), any()))
                .thenReturn(List.of(history1, history2));

        when(queueStatusStore.countWaiting(eventId)).thenReturn(120L);
        when(queueStatusStore.countRecentAdmissions(eq(eventId), any(), any())).thenReturn(10L);

        // when
        QueueDashboardResponse response = adminQueueDashboardService.getEventDashboard(eventId);

        // then
        assertThat(response.eventId()).isEqualTo(eventId);
        assertThat(response.eventName()).isEqualTo("Test Event");
        assertThat(response.currentWaiting()).isEqualTo(120L);
        assertThat(response.peakWaiting()).isEqualTo(120L); // 100 vs 120 -> 120
        assertThat(response.chartData()).hasSize(2);
        // inflow calculation check
        assertThat(response.chartData().get(1).inflowCount()).isEqualTo(30L); // 120 - 100 + 10 = 30
    }

    @Test
    @DisplayName("대기열이 가장 많은 공연 Top 랭킹을 성공적으로 조회한다")
    void getTopWaitingEvents_Success() {
        // given
        Set<Long> activeEventIds = Set.of(1L, 2L);
        when(queueStatusStore.findWaitingEventIds()).thenReturn(activeEventIds);

        Event event1 = mock(Event.class);
        when(event1.getId()).thenReturn(1L);
        when(event1.getTitle()).thenReturn("Event 1");

        Event event2 = mock(Event.class);
        when(event2.getId()).thenReturn(2L);
        when(event2.getTitle()).thenReturn("Event 2");

        when(eventRepository.findAllById(activeEventIds)).thenReturn(List.of(event1, event2));

        // Event 1 has 100 waiting, Event 2 has 200 waiting
        when(queueStatusStore.countWaiting(1L)).thenReturn(100L);
        when(queueStatusStore.countWaiting(2L)).thenReturn(200L);
        
        when(queueStatusStore.countRecentAdmissions(any(), any(), any())).thenReturn(10L);

        // when
        List<QueueEventRankResponse> topEvents = adminQueueDashboardService.getTopWaitingEvents();

        // then
        assertThat(topEvents).hasSize(2);
        assertThat(topEvents.get(0).eventId()).isEqualTo(2L); // 200명 대기
        assertThat(topEvents.get(0).rank()).isEqualTo(1);
        assertThat(topEvents.get(1).eventId()).isEqualTo(1L); // 100명 대기
        assertThat(topEvents.get(1).rank()).isEqualTo(2);
    }
}
