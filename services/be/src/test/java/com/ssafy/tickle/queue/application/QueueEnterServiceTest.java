package com.ssafy.tickle.queue.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.queue.domain.cache.QueueRequestStatus;
import com.ssafy.tickle.queue.domain.cache.SessionOpenInfo;
import com.ssafy.tickle.queue.infrastructure.cache.SessionOpenInfoCache;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterRequest;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterResponse;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.test.EmbeddedKafkaBroker;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.kafka.test.utils.KafkaTestUtils;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 대기열 진입 서비스 통합 테스트입니다.
 */
@SpringBootTest
@EmbeddedKafka(partitions = 1, topics = "queue.enter-request")
@ActiveProfiles("test")
@DisplayName("QueueEnterService 통합 테스트")
class QueueEnterServiceTest {

    @Autowired
    private QueueEnterService queueEnterService;

    @Autowired
    private SessionOpenInfoCache sessionOpenInfoCache;

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Autowired
    private EmbeddedKafkaBroker embeddedKafkaBroker;

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
        @DisplayName("대기열 진입 요청을 호출하면 PENDING 상태와 requestId를 반환한다")
        void enter_returnsPendingResponse() {
            long sessionId = 10L;
            long userId = 1L;
            sessionOpenInfoCache.save(new SessionOpenInfo(
                    sessionId,
                    Instant.now().minusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            QueueEnterResponse response = queueEnterService.enter(new QueueEnterRequest(userId, sessionId));

            assertThat(response.requestId()).isNotBlank();
            assertThat(response.status()).isEqualTo(QueueRequestStatus.PENDING);
        }

        @Test
        @DisplayName("대기열 진입 요청을 호출하면 Redis에 requestId를 저장한다")
        void enter_savesRequestIdToRedis() {
            long sessionId = 10L;
            long userId = 1L;
            sessionOpenInfoCache.save(new SessionOpenInfo(
                    sessionId,
                    Instant.now().minusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            QueueEnterResponse response = queueEnterService.enter(new QueueEnterRequest(userId, sessionId));

            assertThat(response.requestId()).isNotBlank();
            assertThat(stringRedisTemplate.opsForValue().get("queue:enter:" + sessionId + ":" + userId))
                    .isEqualTo(response.requestId());
        }

        @Test
        @DisplayName("대기열 진입 요청을 호출하면 Kafka에 enter-request를 적재한다")
        void enter_publishesEnterRequestToKafka() {
            long sessionId = 10L;
            long userId = 1L;
            sessionOpenInfoCache.save(new SessionOpenInfo(
                    sessionId,
                    Instant.now().minusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            Consumer<String, String> consumer = createConsumer();
            embeddedKafkaBroker.consumeFromAnEmbeddedTopic(consumer, "queue.enter-request");

            QueueEnterResponse response = queueEnterService.enter(new QueueEnterRequest(userId, sessionId));
            ConsumerRecord<String, String> record = KafkaTestUtils.getSingleRecord(consumer, "queue.enter-request");

            assertThat(response.requestId()).isNotBlank();
            assertThat(record.key()).isEqualTo(String.valueOf(sessionId));
            assertThat(record.value()).contains(response.requestId());
            assertThat(record.value()).contains("\"userId\":" + userId);
            assertThat(record.value()).contains("\"sessionId\":" + sessionId);

            consumer.close();
        }

        @Test
        @DisplayName("같은 사용자와 회차로 중복 요청하면 동일한 requestId를 반환한다")
        void enter_returnsSameRequestIdOnDuplicateRequest() {
            long sessionId = 14L;
            long userId = 1L;
            sessionOpenInfoCache.save(new SessionOpenInfo(
                    sessionId,
                    Instant.now().minusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            QueueEnterResponse first = queueEnterService.enter(new QueueEnterRequest(userId, sessionId));
            QueueEnterResponse second = queueEnterService.enter(new QueueEnterRequest(userId, sessionId));

            assertThat(first.requestId()).isNotBlank();
            assertThat(second.requestId()).isEqualTo(first.requestId());
            assertThat(second.status()).isEqualTo(QueueRequestStatus.PENDING);
        }

        @Test
        @DisplayName("오픈 전 회차면 INVALID_REQUEST 예외가 발생한다")
        void enter_beforeOpen_throwsQueueNotOpen() {
            long sessionId = 11L;
            sessionOpenInfoCache.save(new SessionOpenInfo(
                    sessionId,
                    Instant.now().plusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            assertThatThrownBy(() -> queueEnterService.enter(new QueueEnterRequest(1L, sessionId)))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.INVALID_REQUEST);
        }

        @Test
        @DisplayName("판매 종료된 회차면 INVALID_REQUEST 예외가 발생한다")
        void enter_afterClose_throwsQueueClosed() {
            long sessionId = 12L;
            sessionOpenInfoCache.save(new SessionOpenInfo(
                    sessionId,
                    Instant.now().minusSeconds(600),
                    Instant.now().minusSeconds(60)
            ));

            assertThatThrownBy(() -> queueEnterService.enter(new QueueEnterRequest(1L, sessionId)))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.INVALID_REQUEST);
        }

        @Test
        @DisplayName("캐시에 회차 오픈 정보가 없으면 DB fallback 없이 바로 RESOURCE_NOT_FOUND 예외가 발생한다")
        void enter_missingSessionOpenInfo_failsFastWithoutFallback() {
            long sessionId = 13L;

            assertThatThrownBy(() -> queueEnterService.enter(new QueueEnterRequest(1L, sessionId)))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.RESOURCE_NOT_FOUND);
        }
    }

    private Consumer<String, String> createConsumer() {
        Map<String, Object> properties = new HashMap<>();
        properties.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, embeddedKafkaBroker.getBrokersAsString());
        properties.put(ConsumerConfig.GROUP_ID_CONFIG, "queue-enter-service-test");
        properties.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "true");
        properties.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        properties.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        properties.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        return new DefaultKafkaConsumerFactory<>(properties, new StringDeserializer(), new StringDeserializer())
                .createConsumer();
    }
}
