package com.ssafy.tickle.queue.application;

import com.ssafy.tickle.queue.application.scheduler.QueueAdmissionScheduler;
import com.ssafy.tickle.queue.application.service.QueueEnterService;
import com.ssafy.tickle.queue.application.service.QueueStatusService;
import com.ssafy.tickle.queue.config.QueueConstants;
import com.ssafy.tickle.queue.domain.QueueRequestStatus;
import com.ssafy.tickle.queue.infrastructure.cache.store.QueueStatusStore;
import com.ssafy.tickle.queue.infrastructure.cache.store.EventOpenInfoStore;
import com.ssafy.tickle.queue.infrastructure.cache.model.EventOpenInfo;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterResponse;
import com.ssafy.tickle.queue.presentation.dto.QueueTokenResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 대기열 admission scheduler 통합 테스트입니다.
 */
@SpringBootTest
@EmbeddedKafka(partitions = 1, topics = QueueConstants.ENTER_REQUEST_TOPIC)
@ActiveProfiles("test")
@DisplayName("QueueAdmissionScheduler 통합 테스트")
class QueueAdmissionSchedulerTest {

    @Autowired
    private QueueEnterService queueEnterService;

    @Autowired
    private QueueStatusService queueStatusService;

    @Autowired
    private QueueAdmissionScheduler queueAdmissionScheduler;

    @Autowired
    private QueueStatusStore queueStatusStore;

    @Autowired
    private EventOpenInfoStore eventOpenInfoStore;

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @AfterEach
    void tearDown() {
        stringRedisTemplate.getConnectionFactory()
                .getConnection()
                .serverCommands()
                .flushDb();
    }

    @Test
        @DisplayName("slotLimit 기준으로 waiting 상위 사용자만 ADMITTED 처리한다")
    void admitWaitingUsers_admitsTopHundredUsersOnly() throws InterruptedException {
        long eventId = 40L;
        eventOpenInfoStore.save(new EventOpenInfo(
                eventId,
                Instant.now().minusSeconds(60),
                Instant.now().plusSeconds(600)
        ));

        List<String> queueTokens = new ArrayList<>();
        for (long userId = 1L; userId <= 101L; userId++) {
            QueueEnterResponse enterResponse = queueEnterService.enter(eventId, userId);
            QueueTokenResponse tokenResponse = awaitQueueToken(eventId, enterResponse.requestId());
            queueTokens.add(tokenResponse.queueToken());

            // waiting zset score를 등록 순서대로 분리해 admission 순서를 안정적으로 만든다.
            Thread.sleep(2L);
        }

        // Kafka 비동기 처리 대기
        int attempts = 0;
        while (queueStatusStore.countWaiting(eventId) < 101L && attempts < 50) {
            Thread.sleep(100);
            attempts++;
        }

        queueAdmissionScheduler.admitWaitingUsers();

        long admittedCount = queueTokens.stream()
                .map(queueToken -> queueStatusService.getStatusByQueueToken(eventId, queueToken))
                .filter(response -> response.status() == QueueRequestStatus.ADMITTED)
                .count();
        long waitingCount = queueTokens.stream()
                .map(queueToken -> queueStatusService.getStatusByQueueToken(eventId, queueToken))
                .filter(response -> response.status() == QueueRequestStatus.WAITING)
                .count();

        assertThat(admittedCount).isEqualTo(QueueConstants.SLOT_LIMIT);
        assertThat(waitingCount).isEqualTo(1L);
        assertThat(queueStatusStore.countAdmitted(eventId)).isEqualTo(QueueConstants.SLOT_LIMIT);
        assertThat(queueStatusStore.countWaiting(eventId)).isEqualTo(1L);
        assertThat(queueStatusStore.countRecentAdmissions(eventId, Instant.now().minusSeconds(60), Instant.now()))
                .isEqualTo(QueueConstants.SLOT_LIMIT);

        queueTokens.stream()
                .map(queueToken -> queueStatusService.getStatusByQueueToken(eventId, queueToken))
                .filter(response -> response.status() == QueueRequestStatus.ADMITTED)
                .forEach(response -> assertThat(response.admitToken()).isNotBlank());
    }

    private QueueTokenResponse awaitQueueToken(Long eventId, String requestId) {
        for (int attempts = 0; attempts < 50; attempts++) {
            QueueTokenResponse response = queueStatusService.getQueueToken(eventId, requestId);
            if (response.queueToken() != null) {
                return response;
            }

            try {
                Thread.sleep(100L);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("queueToken 발급 대기 중 인터럽트되었습니다.", exception);
            }
        }

        return queueStatusService.getQueueToken(eventId, requestId);
    }
}
