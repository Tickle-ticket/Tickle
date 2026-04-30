package com.ssafy.tickle.queue.application;

import com.ssafy.tickle.queue.application.scheduler.QueueAdmissionScheduler;
import com.ssafy.tickle.queue.application.service.QueueEnterService;
import com.ssafy.tickle.queue.application.service.QueueStatusService;
import com.ssafy.tickle.queue.config.QueueConstants;
import com.ssafy.tickle.queue.domain.QueueRequestStatus;
import com.ssafy.tickle.queue.infrastructure.cache.store.QueueStatusStore;
import com.ssafy.tickle.queue.infrastructure.cache.store.SessionOpenInfoStore;
import com.ssafy.tickle.queue.infrastructure.cache.model.SessionOpenInfo;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterRequest;
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
    private SessionOpenInfoStore sessionOpenInfoStore;

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
        long sessionId = 40L;
        sessionOpenInfoStore.save(new SessionOpenInfo(
                sessionId,
                Instant.now().minusSeconds(60),
                Instant.now().plusSeconds(600)
        ));

        List<String> queueTokens = new ArrayList<>();
        for (long userId = 1L; userId <= 101L; userId++) {
            QueueEnterResponse enterResponse = queueEnterService.enter(sessionId, new QueueEnterRequest(userId));
            QueueTokenResponse tokenResponse = queueStatusService.getQueueToken(sessionId, enterResponse.requestId());
            queueTokens.add(tokenResponse.queueToken());

            // waiting zset score를 등록 순서대로 분리해 admission 순서를 안정적으로 만든다.
            Thread.sleep(2L);
        }

        // Kafka 비동기 처리 대기
        int attempts = 0;
        while (queueStatusStore.countWaiting(sessionId) < 101L && attempts < 50) {
            Thread.sleep(100);
            attempts++;
        }

        queueAdmissionScheduler.admitWaitingUsers();

        long admittedCount = queueTokens.stream()
                .map(queueToken -> queueStatusService.getStatusByQueueToken(sessionId, queueToken))
                .filter(response -> response.status() == QueueRequestStatus.ADMITTED)
                .count();
        long waitingCount = queueTokens.stream()
                .map(queueToken -> queueStatusService.getStatusByQueueToken(sessionId, queueToken))
                .filter(response -> response.status() == QueueRequestStatus.WAITING)
                .count();

        assertThat(admittedCount).isEqualTo(QueueConstants.SLOT_LIMIT);
        assertThat(waitingCount).isEqualTo(1L);
        assertThat(queueStatusStore.countAdmitted(sessionId)).isEqualTo(QueueConstants.SLOT_LIMIT);
        assertThat(queueStatusStore.countWaiting(sessionId)).isEqualTo(1L);
        assertThat(queueStatusStore.countRecentAdmissions(sessionId, Instant.now().minusSeconds(60), Instant.now()))
                .isEqualTo(QueueConstants.SLOT_LIMIT);

        queueTokens.stream()
                .map(queueToken -> queueStatusService.getStatusByQueueToken(sessionId, queueToken))
                .filter(response -> response.status() == QueueRequestStatus.ADMITTED)
                .forEach(response -> assertThat(response.admitToken()).isNotBlank());
    }
}
