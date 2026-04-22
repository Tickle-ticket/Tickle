package com.ssafy.tickle.queue.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.queue.domain.cache.QueueRequestStatus;
import com.ssafy.tickle.queue.domain.cache.SessionOpenInfo;
import com.ssafy.tickle.queue.infrastructure.cache.SessionOpenInfoCache;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterRequest;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterResponse;
import com.ssafy.tickle.queue.presentation.dto.QueueStatusResponse;
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
@EmbeddedKafka(partitions = 1, topics = "queue.enter-request")
@ActiveProfiles("test")
@DisplayName("QueueStatusService 통합 테스트")
class QueueStatusServiceTest {

    @Autowired
    private QueueEnterService queueEnterService;

    @Autowired
    private QueueStatusService queueStatusService;

    @Autowired
    private SessionOpenInfoCache sessionOpenInfoCache;

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
            sessionOpenInfoCache.save(new SessionOpenInfo(
                    sessionId,
                    Instant.now().minusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            QueueEnterResponse enterResponse = queueEnterService.enter(new QueueEnterRequest(userId, sessionId));

            QueueStatusResponse statusResponse = queueStatusService.getQueueToken(enterResponse.requestId());

            assertThat(statusResponse.queueToken()).isNotBlank();
            assertThat(statusResponse.status()).isEqualTo(QueueRequestStatus.WAITING);
        }

        @Test
        @DisplayName("같은 requestId로 다시 조회하면 동일한 queueToken을 반환한다")
        void getQueueToken_returnsSameQueueToken() {
            long sessionId = 21L;
            long userId = 1L;
            sessionOpenInfoCache.save(new SessionOpenInfo(
                    sessionId,
                    Instant.now().minusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            QueueEnterResponse enterResponse = queueEnterService.enter(new QueueEnterRequest(userId, sessionId));

            QueueStatusResponse first = queueStatusService.getQueueToken(enterResponse.requestId());
            QueueStatusResponse second = queueStatusService.getQueueToken(enterResponse.requestId());

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
}
