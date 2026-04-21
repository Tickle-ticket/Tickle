package com.ssafy.tickle.queue.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.queue.domain.QueueRequestStatus;
import com.ssafy.tickle.queue.domain.SessionOpenInfo;
import com.ssafy.tickle.queue.infrastructure.cache.SessionOpenInfoCache;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterRequest;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 대기열 진입 서비스 통합 테스트입니다.
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("QueueService 통합 테스트")
class QueueServiceTest {

    @Autowired
    private QueueService queueService;

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
    @DisplayName("enter")
    class Enter {

        @Test
        @DisplayName("캐시에 회차 오픈 정보가 있으면 해당 값을 사용해 진입 요청을 접수한다")
        void enter_usesCachedSessionOpenInfo() {
            long sessionId = 10L;
            sessionOpenInfoCache.save(new SessionOpenInfo(
                    sessionId,
                    Instant.now().minusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            QueueEnterResponse response = queueService.enter(new QueueEnterRequest(1L, sessionId));

            assertThat(response.requestId()).isNotBlank();
            assertThat(response.status()).isEqualTo(QueueRequestStatus.PENDING);
        }

        @Test
        @DisplayName("오픈 전 회차면 QUEUE_NOT_OPEN 예외가 발생한다")
        void enter_beforeOpen_throwsQueueNotOpen() {
            long sessionId = 11L;
            sessionOpenInfoCache.save(new SessionOpenInfo(
                    sessionId,
                    Instant.now().plusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            assertThatThrownBy(() -> queueService.enter(new QueueEnterRequest(1L, sessionId)))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.QUEUE_NOT_OPEN);
        }

        @Test
        @DisplayName("판매 종료된 회차면 QUEUE_CLOSED 예외가 발생한다")
        void enter_afterClose_throwsQueueClosed() {
            long sessionId = 12L;
            sessionOpenInfoCache.save(new SessionOpenInfo(
                    sessionId,
                    Instant.now().minusSeconds(600),
                    Instant.now().minusSeconds(60)
            ));

            assertThatThrownBy(() -> queueService.enter(new QueueEnterRequest(1L, sessionId)))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.QUEUE_CLOSED);
        }

        @Test
        @DisplayName("캐시에 회차 오픈 정보가 없으면 DB fallback 없이 바로 RESOURCE_NOT_FOUND 예외가 발생한다")
        void enter_missingSessionOpenInfo_failsFastWithoutFallback() {
            long sessionId = 13L;

            assertThatThrownBy(() -> queueService.enter(new QueueEnterRequest(1L, sessionId)))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.RESOURCE_NOT_FOUND);
        }
    }
}
