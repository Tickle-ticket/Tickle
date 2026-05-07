package com.ssafy.tickle.queue.application;

import com.ssafy.tickle.queue.application.scheduler.QueueAdmissionScheduler;
import com.ssafy.tickle.queue.application.scheduler.QueueStatusCleanupScheduler;
import com.ssafy.tickle.queue.application.service.QueueEnterService;
import com.ssafy.tickle.queue.application.service.QueueStatusService;
import com.ssafy.tickle.queue.config.QueueConstants;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@EmbeddedKafka(partitions = 1, topics = QueueConstants.ENTER_REQUEST_TOPIC)
@ActiveProfiles("test")
@DisplayName("QueueStatusCleanupScheduler 통합 테스트")
class QueueStatusCleanupSchedulerTest {

    @Autowired
    private QueueEnterService queueEnterService;

    @Autowired
    private QueueStatusService queueStatusService;

    @Autowired
    private QueueStatusStore queueStatusStore;

    @Autowired
    private QueueAdmissionScheduler queueAdmissionScheduler;

    @Autowired
    private QueueStatusCleanupScheduler queueStatusCleanupScheduler;

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
    @DisplayName("queueToken TTL이 지난 WAITING 사용자는 EXPIRED로 정리된다")
    void cleanupWaitingUsers_expiresQueueTokenExpiredUser() {
        long eventId = 50L;
        long userId = 1L;
        eventOpenInfoStore.save(new EventOpenInfo(
                eventId,
                Instant.now().minusSeconds(60),
                Instant.now().plusSeconds(600)
        ));

        QueueEnterResponse enterResponse = queueEnterService.enter(eventId, userId);
        QueueTokenResponse tokenResponse = queueStatusService.getQueueToken(eventId, enterResponse.requestId());

        stringRedisTemplate.opsForHash().put(
                QueueConstants.STATUS_KEY_PREFIX + tokenResponse.queueToken(),
                "registeredAt",
                String.valueOf(Instant.now().minus(queueStatusService.queueTokenTtl()).minusSeconds(1).toEpochMilli())
        );

        queueStatusCleanupScheduler.cleanupWaitingUsers();

        assertThat(queueStatusStore.countWaiting(eventId)).isZero();
        assertThatThrownBy(() -> queueStatusService.getQueueToken(eventId, enterResponse.requestId()))
                .isInstanceOf(com.ssafy.tickle.common.exception.BaseException.class);
    }

    @Test
    @DisplayName("admitToken TTL이 지난 ADMITTED 사용자는 EXPIRED로 정리된다")
    void cleanupAdmittedUsers_expiresAdmittedUser() {
        long eventId = 51L;
        long userId = 1L;
        eventOpenInfoStore.save(new EventOpenInfo(
                eventId,
                Instant.now().minusSeconds(60),
                Instant.now().plusSeconds(600)
        ));

        QueueEnterResponse enterResponse = queueEnterService.enter(eventId, userId);
        QueueTokenResponse tokenResponse = queueStatusService.getQueueToken(eventId, enterResponse.requestId());
        queueAdmissionScheduler.admitWaitingUsers();

        stringRedisTemplate.opsForHash().put(
                QueueConstants.STATUS_KEY_PREFIX + tokenResponse.queueToken(),
                "admittedAt",
                String.valueOf(Instant.now().minus(queueStatusService.admitTokenTtl()).minusSeconds(1).toEpochMilli())
        );

        queueStatusCleanupScheduler.cleanupAdmittedUsers();

        assertThat(queueStatusStore.countAdmitted(eventId)).isZero();
        assertThatThrownBy(() -> queueStatusService.getQueueToken(eventId, enterResponse.requestId()))
                .isInstanceOf(com.ssafy.tickle.common.exception.BaseException.class);
    }
}
