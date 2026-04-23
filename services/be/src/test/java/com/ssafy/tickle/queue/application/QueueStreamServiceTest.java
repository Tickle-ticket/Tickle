package com.ssafy.tickle.queue.application;

import com.ssafy.tickle.queue.domain.QueueRequestStatus;
import com.ssafy.tickle.queue.presentation.dto.QueueStatusResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("QueueStreamService 단위 테스트")
class QueueStreamServiceTest {

    @Test
    @DisplayName("connect는 emitter를 등록하고 최초 상태를 조회한다")
    void connect_registersEmitterAndLoadsInitialStatus() {
        String queueToken = "queue-token";
        QueueStatusService queueStatusService = mock(QueueStatusService.class);
        QueueStreamService queueStreamService = new QueueStreamService(queueStatusService);

        when(queueStatusService.getStatusByQueueToken(queueToken))
                .thenReturn(QueueStatusResponse.waiting(
                        queueToken,
                        1L,
                        1L,
                        0L,
                        Instant.now()
                ));

        SseEmitter emitter = queueStreamService.connect(queueToken);

        assertThat(emitter).isNotNull();
        assertThat(emitters(queueStreamService)).containsKey(queueToken);
        verify(queueStatusService, times(1)).getStatusByQueueToken(queueToken);
    }

    @Test
    @DisplayName("pushStatus는 등록된 emitter에 대해 최신 상태를 다시 조회한다")
    void pushStatus_refreshesEmitterState() {
        String queueToken = "queue-token";
        QueueStatusService queueStatusService = mock(QueueStatusService.class);
        QueueStreamService queueStreamService = new QueueStreamService(queueStatusService);

        when(queueStatusService.getStatusByQueueToken(queueToken))
                .thenReturn(QueueStatusResponse.waiting(
                        queueToken,
                        1L,
                        1L,
                        0L,
                        Instant.now()
                ));

        queueStreamService.connect(queueToken);
        queueStreamService.pushStatus();

        verify(queueStatusService, times(2)).getStatusByQueueToken(queueToken);
        assertThat(emitters(queueStreamService)).containsKey(queueToken);
    }

    @Test
    @DisplayName("pushStatus 중 상태 조회가 실패하면 emitter를 제거한다")
    void pushStatus_removesEmitterOnFailure() {
        String queueToken = "queue-token";
        QueueStatusService queueStatusService = mock(QueueStatusService.class);
        QueueStreamService queueStreamService = new QueueStreamService(queueStatusService);

        when(queueStatusService.getStatusByQueueToken(queueToken))
                .thenReturn(QueueStatusResponse.admitted(queueToken, "admit-token"))
                .thenThrow(new RuntimeException("status lookup failed"));

        queueStreamService.connect(queueToken);
        queueStreamService.pushStatus();

        assertThat(emitters(queueStreamService)).doesNotContainKey(queueToken);
    }

    @SuppressWarnings("unchecked")
    private Map<String, SseEmitter> emitters(QueueStreamService queueStreamService) {
        return (Map<String, SseEmitter>) ReflectionTestUtils.getField(queueStreamService, "emitters");
    }
}
