package com.ssafy.tickle.queue.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.queue.application.service.QueueEnterService;
import com.ssafy.tickle.queue.config.QueueConstants;
import com.ssafy.tickle.queue.domain.QueueRequestStatus;
import com.ssafy.tickle.queue.domain.QueueScope;
import com.ssafy.tickle.queue.infrastructure.cache.model.EventOpenInfo;
import com.ssafy.tickle.queue.infrastructure.cache.store.EventOpenInfoStore;
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
@EmbeddedKafka(partitions = 1, topics = QueueConstants.ENTER_REQUEST_TOPIC)
@ActiveProfiles("test")
@DisplayName("QueueEnterService 통합 테스트")
class QueueEnterServiceTest {

    @Autowired
    private QueueEnterService queueEnterService;

    @Autowired
    private EventOpenInfoStore eventOpenInfoStore;

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
            long eventId = 10L;
            long userId = 1L;
            eventOpenInfoStore.save(new EventOpenInfo(
                    eventId,
                    Instant.now().minusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            QueueEnterResponse response = queueEnterService.enter(eventId, new QueueEnterRequest(userId));

            assertThat(response.requestId()).isNotBlank();
            assertThat(response.status()).isEqualTo(QueueRequestStatus.PENDING);
        }

        @Test
        @DisplayName("대기열 진입 요청을 호출하면 Redis에 requestId를 저장한다")
        void enter_savesRequestIdToRedis() {
            long eventId = 10L;
            long userId = 1L;
            eventOpenInfoStore.save(new EventOpenInfo(
                    eventId,
                    Instant.now().minusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            QueueEnterResponse response = queueEnterService.enter(eventId, new QueueEnterRequest(userId));

            assertThat(response.requestId()).isNotBlank();
            assertThat(stringRedisTemplate.opsForValue().get(QueueConstants.ENTER_KEY_PREFIX + "BOOKING:" + eventId + ":" + userId))
                    .isEqualTo(response.requestId());
        }

        @Test
        @DisplayName("대기열 진입 요청을 호출하면 Kafka에 enter-request를 적재한다")
        void enter_publishesEnterRequestToKafka() {
            long eventId = 99L;  // 다른 테스트와 겹치지 않는 고유 eventId
            long userId = 99L;
            eventOpenInfoStore.save(new EventOpenInfo(
                    eventId,
                    Instant.now().minusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            Consumer<String, String> consumer = createConsumer();
            embeddedKafkaBroker.consumeFromAnEmbeddedTopic(consumer, QueueConstants.ENTER_REQUEST_TOPIC);

            QueueEnterResponse response = queueEnterService.enter(eventId, new QueueEnterRequest(userId));

            // getSingleRecord 대신 getRecords로 조회 후 해당 requestId 포함 여부 검증
            var records = KafkaTestUtils.getRecords(consumer, java.time.Duration.ofSeconds(3));
            var matchingRecord = java.util.stream.StreamSupport.stream(
                    records.records(QueueConstants.ENTER_REQUEST_TOPIC).spliterator(), false
            )
                    .filter(r -> r.value().contains(response.requestId()))
                    .findFirst();

            assertThat(response.requestId()).isNotBlank();
            assertThat(matchingRecord).isPresent();
            assertThat(matchingRecord.get().key()).isEqualTo("BOOKING:" + eventId);
            assertThat(matchingRecord.get().value()).contains("\"userId\":" + userId);
            assertThat(matchingRecord.get().value()).contains("\"scope\":\"BOOKING\"");
            assertThat(matchingRecord.get().value()).contains("\"eventId\":" + eventId);

            consumer.close();
        }

        @Test
        @DisplayName("같은 사용자와 공연으로 중복 요청하면 동일한 requestId를 반환한다")
        void enter_returnsSameRequestIdOnDuplicateRequest() {
            long eventId = 14L;
            long userId = 1L;
            eventOpenInfoStore.save(new EventOpenInfo(
                    eventId,
                    Instant.now().minusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            QueueEnterResponse first = queueEnterService.enter(eventId, new QueueEnterRequest(userId));
            QueueEnterResponse second = queueEnterService.enter(eventId, new QueueEnterRequest(userId));

            assertThat(first.requestId()).isNotBlank();
            assertThat(second.requestId()).isEqualTo(first.requestId());
            assertThat(second.status()).isEqualTo(QueueRequestStatus.PENDING);
        }

        @Test
        @DisplayName("같은 사용자와 공연이라도 scope가 다르면 서로 다른 requestId를 반환한다")
        void enter_allowsSeparateRequestIdByScope() {
            long eventId = 15L;
            long userId = 1L;
            eventOpenInfoStore.save(new EventOpenInfo(
                    eventId,
                    Instant.now().minusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            QueueEnterResponse booking = queueEnterService.enter(QueueScope.BOOKING, eventId, new QueueEnterRequest(userId));
            QueueEnterResponse cancellationWait = queueEnterService.enter(QueueScope.CANCELLATION_WAIT, eventId, new QueueEnterRequest(userId));

            assertThat(booking.requestId()).isNotBlank();
            assertThat(cancellationWait.requestId()).isNotBlank();
            assertThat(cancellationWait.requestId()).isNotEqualTo(booking.requestId());
        }

        @Test
        @DisplayName("오픈 전 공연이면 INVALID_REQUEST 예외가 발생한다")
        void enter_beforeOpen_throwsQueueNotOpen() {
            long eventId = 11L;
            eventOpenInfoStore.save(new EventOpenInfo(
                    eventId,
                    Instant.now().plusSeconds(60),
                    Instant.now().plusSeconds(600)
            ));

            assertThatThrownBy(() -> queueEnterService.enter(eventId, new QueueEnterRequest(1L)))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.INVALID_REQUEST);
        }

        @Test
        @DisplayName("판매 종료된 공연이면 INVALID_REQUEST 예외가 발생한다")
        void enter_afterClose_throwsQueueClosed() {
            long eventId = 12L;
            eventOpenInfoStore.save(new EventOpenInfo(
                    eventId,
                    Instant.now().minusSeconds(600),
                    Instant.now().minusSeconds(60)
            ));

            assertThatThrownBy(() -> queueEnterService.enter(eventId, new QueueEnterRequest(1L)))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.INVALID_REQUEST);
        }

        @Test
        @DisplayName("캐시에 공연 오픈 정보가 없으면 DB fallback 없이 바로 RESOURCE_NOT_FOUND 예외가 발생한다")
        void enter_missingEventOpenInfo_failsFastWithoutFallback() {
            long eventId = 13L;

            assertThatThrownBy(() -> queueEnterService.enter(eventId, new QueueEnterRequest(1L)))
                    .isInstanceOf(BaseException.class)
                    .extracting("errorCode")
                    .isEqualTo(GlobalErrorCode.RESOURCE_NOT_FOUND);
        }
    }

    private Consumer<String, String> createConsumer() {
        Map<String, Object> properties = new HashMap<>();
        properties.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, embeddedKafkaBroker.getBrokersAsString());
        properties.put(ConsumerConfig.GROUP_ID_CONFIG, "queue-enter-service-test-" + System.nanoTime()); // 테스트마다 고유 그룹
        properties.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "true");
        properties.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        properties.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        properties.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "latest");

        return new DefaultKafkaConsumerFactory<>(properties, new StringDeserializer(), new StringDeserializer())
                .createConsumer();
    }
}
