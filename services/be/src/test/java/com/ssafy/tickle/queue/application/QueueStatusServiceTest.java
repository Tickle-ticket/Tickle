package com.ssafy.tickle.queue.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.queue.application.scheduler.QueueAdmissionScheduler;
import com.ssafy.tickle.queue.application.service.QueueEnterService;
import com.ssafy.tickle.queue.application.service.QueueStatusService;
import com.ssafy.tickle.queue.config.QueueConstants;
import com.ssafy.tickle.queue.domain.QueueRequestStatus;
import com.ssafy.tickle.queue.infrastructure.cache.store.QueueStatusStore;
import com.ssafy.tickle.queue.infrastructure.cache.model.SessionOpenInfo;
import com.ssafy.tickle.queue.infrastructure.cache.store.SessionOpenInfoStore;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterRequest;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterResponse;
import com.ssafy.tickle.queue.presentation.dto.QueueStatusResponse;
import com.ssafy.tickle.queue.presentation.dto.QueueTokenResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 대기열 상태 조회 서비스 통합 테스트입니다.
 */
@SpringBootTest
@EmbeddedKafka(partitions = 1, topics = QueueConstants.ENTER_REQUEST_TOPIC)
@ActiveProfiles("test")
@DisplayName("QueueStatusService 통합 테스트")
class QueueStatusServiceTest {

    @Autowired
    private QueueEnterService queueEnterService;

    @Autowired
    private QueueStatusService queueStatusService;

    @Autowired
    private QueueAdmissionScheduler queueAdmissionScheduler;

    @Autowired
    private SessionOpenInfoStore sessionOpenInfoStore;

    @Autowired
    private QueueStatusStore queueStatusStore;

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @AfterEach
    void tearDown() {
        stringRedisTemplate.getConnectionFactory()
                .getConnection()
                .serverCommands()
                .flushDb();
    }

    @Nested
    @DisplayName("getQueueToken")
    class GetQueueToken {

        @Test
        @DisplayName("기존 requestId로 최초 queueToken을 발급받을 수 있다")
        void getQueueToken_issuesQueueToken() {
            long sessionId = 20L;
            long userId = 1L;
            sessionOpenInfoStore.save(new SessionOpenInfo(
                    sessionId,
                    Instant.now().minusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            QueueEnterResponse enterResponse = queueEnterService.enter(sessionId, new QueueEnterRequest(userId));

            QueueTokenResponse tokenResponse = queueStatusService.getQueueToken(sessionId, enterResponse.requestId());

            assertThat(tokenResponse.queueToken()).isNotBlank();
            assertThat(tokenResponse.status()).isEqualTo(QueueRequestStatus.WAITING);
        }

        @Test
        @DisplayName("같은 requestId로 다시 조회하면 동일한 queueToken을 반환한다")
        void getQueueToken_returnsSameQueueToken() {
            long sessionId = 21L;
            long userId = 1L;
            sessionOpenInfoStore.save(new SessionOpenInfo(
                    sessionId,
                    Instant.now().minusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            QueueEnterResponse enterResponse = queueEnterService.enter(sessionId, new QueueEnterRequest(userId));

            QueueTokenResponse first = queueStatusService.getQueueToken(sessionId, enterResponse.requestId());
            QueueTokenResponse second = queueStatusService.getQueueToken(sessionId, enterResponse.requestId());

            assertThat(first.queueToken()).isNotBlank();
            assertThat(second.queueToken()).isEqualTo(first.queueToken());
            assertThat(second.status()).isEqualTo(QueueRequestStatus.WAITING);
        }

        @Test
        @DisplayName("존재하지 않는 requestId로 조회하면 RESOURCE_NOT_FOUND 예외가 발생한다")
        void getQueueToken_missingRequestId_throwsResourceNotFound() {
            assertThatThrownBy(() -> queueStatusService.getQueueToken("missing-request-id"))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.RESOURCE_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("getStatusByQueueToken")
    class GetStatusByQueueToken {

        @Test
        @DisplayName("queueToken으로 현재 순번과 ETA를 조회할 수 있다")
        void getStatusByQueueToken_returnsWaitingStatus() {
            long sessionId = 30L;
            long userId = 1L;
            sessionOpenInfoStore.save(new SessionOpenInfo(
                    sessionId,
                    Instant.now().minusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            QueueEnterResponse enterResponse = queueEnterService.enter(sessionId, new QueueEnterRequest(userId));
            QueueTokenResponse tokenResponse = queueStatusService.getQueueToken(sessionId, enterResponse.requestId());

            QueueStatusResponse statusResponse = queueStatusService.getStatusByQueueToken(sessionId, tokenResponse.queueToken());

            assertThat(statusResponse.queueToken()).isEqualTo(tokenResponse.queueToken());
            assertThat(statusResponse.status()).isEqualTo(QueueRequestStatus.WAITING);
            assertThat(statusResponse.rank()).isEqualTo(1L);
            assertThat(statusResponse.waitingCount()).isEqualTo(1L);
            assertThat(statusResponse.estimatedWaitSeconds()).isEqualTo(0L);
            assertThat(statusResponse.estimatedEntryAt()).isNotNull();
            assertThat(statusResponse.admitToken()).isNull();
        }

        @Test
        @DisplayName("admission 이후에는 ADMITTED 상태와 admitToken을 반환한다")
        void getStatusByQueueToken_returnsAdmittedStatus() {
            long sessionId = 31L;
            long userId = 1L;
            sessionOpenInfoStore.save(new SessionOpenInfo(
                    sessionId,
                    Instant.now().minusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            QueueEnterResponse enterResponse = queueEnterService.enter(sessionId, new QueueEnterRequest(userId));
            QueueTokenResponse tokenResponse = queueStatusService.getQueueToken(sessionId, enterResponse.requestId());

            queueAdmissionScheduler.admitWaitingUsers();

            QueueStatusResponse statusResponse = queueStatusService.getStatusByQueueToken(sessionId, tokenResponse.queueToken());

            assertThat(statusResponse.queueToken()).isEqualTo(tokenResponse.queueToken());
            assertThat(statusResponse.status()).isEqualTo(QueueRequestStatus.ADMITTED);
            assertThat(statusResponse.rank()).isNull();
            assertThat(statusResponse.waitingCount()).isNull();
            assertThat(statusResponse.estimatedWaitSeconds()).isNull();
            assertThat(statusResponse.estimatedEntryAt()).isNull();
            assertThat(statusResponse.admitToken()).isNotBlank();
        }
    }

    @Nested
    @DisplayName("leave")
    class Leave {

        @Test
        @DisplayName("WAITING 상태 사용자가 leave 하면 LEFT 상태가 되고 waiting 목록에서 제거된다")
        void leave_waitingUser() {
            long sessionId = 33L;
            long userId = 1L;
            sessionOpenInfoStore.save(new SessionOpenInfo(
                    sessionId,
                    Instant.now().minusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            QueueEnterResponse enterResponse = queueEnterService.enter(sessionId, new QueueEnterRequest(userId));
            QueueTokenResponse tokenResponse = queueStatusService.getQueueToken(sessionId, enterResponse.requestId());

            queueStatusService.leave(sessionId, tokenResponse.queueToken());

            assertThat(queueStatusStore.countWaiting(sessionId)).isZero();
            assertThatThrownBy(() -> queueStatusService.getQueueToken(sessionId, enterResponse.requestId()))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.RESOURCE_NOT_FOUND);
        }

        @Test
        @DisplayName("ADMITTED 상태 사용자가 leave 하면 LEFT 상태가 되고 admitted 목록에서 제거된다")
        void leave_admittedUser() {
            long sessionId = 34L;
            long userId = 1L;
            sessionOpenInfoStore.save(new SessionOpenInfo(
                    sessionId,
                    Instant.now().minusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            QueueEnterResponse enterResponse = queueEnterService.enter(sessionId, new QueueEnterRequest(userId));
            QueueTokenResponse tokenResponse = queueStatusService.getQueueToken(sessionId, enterResponse.requestId());
            queueAdmissionScheduler.admitWaitingUsers();

            queueStatusService.leave(sessionId, tokenResponse.queueToken());

            assertThat(queueStatusStore.countAdmitted(sessionId)).isZero();
            assertThatThrownBy(() -> queueStatusService.getQueueToken(sessionId, enterResponse.requestId()))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.RESOURCE_NOT_FOUND);
        }
    }
}
