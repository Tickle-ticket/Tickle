package com.ssafy.tickle.queue.application;

import com.ssafy.tickle.queue.application.service.QueueSseHandler;
import com.ssafy.tickle.queue.application.service.QueueStatusService;
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
class QueueSseHandlerTest {

    @Test
    @DisplayName("connect는 emitter를 등록하고 최초 상태를 조회한다")
    void connect_registersEmitterAndLoadsInitialStatus() {
        String queueToken = "queue-token";
        QueueStatusService queueStatusService = mock(QueueStatusService.class);
        QueueSseHandler queueSseHandler = new QueueSseHandler(queueStatusService);

        when(queueStatusService.getStatusByQueueToken(queueToken))
                .thenReturn(QueueStatusResponse.waiting(
                        queueToken,
                        1L,
                        1L,
                        0L,
                        Instant.now()
                ));

        SseEmitter emitter = queueSseHandler.connect(queueToken);

        assertThat(emitter).isNotNull();
        assertThat(emitters(queueSseHandler)).containsKey(queueToken);
        verify(queueStatusService, times(1)).getStatusByQueueToken(queueToken);
    }

    @Test
    @DisplayName("pushStatus는 등록된 emitter에 대해 최신 상태를 다시 조회한다")
    void pushStatus_refreshesEmitterState() {
        String queueToken = "queue-token";
        QueueStatusService queueStatusService = mock(QueueStatusService.class);
        QueueSseHandler queueSseHandler = new QueueSseHandler(queueStatusService);

        when(queueStatusService.getStatusByQueueToken(queueToken))
                .thenReturn(QueueStatusResponse.waiting(
                        queueToken,
                        1L,
                        1L,
                        0L,
                        Instant.now()
                ));

        queueSseHandler.connect(queueToken);
        queueSseHandler.pushStatus();

        verify(queueStatusService, times(2)).getStatusByQueueToken(queueToken);
        assertThat(emitters(queueSseHandler)).containsKey(queueToken);
    }

    @Test
    @DisplayName("pushStatus 중 상태 조회가 실패하면 emitter를 제거한다")
    void pushStatus_removesEmitterOnFailure() {
        String queueToken = "queue-token";
        QueueStatusService queueStatusService = mock(QueueStatusService.class);
        QueueSseHandler queueSseHandler = new QueueSseHandler(queueStatusService);

        when(queueStatusService.getStatusByQueueToken(queueToken))
                .thenReturn(QueueStatusResponse.admitted(queueToken, "admit-token"))
                .thenThrow(new RuntimeException("status lookup failed"));

        queueSseHandler.connect(queueToken);
        queueSseHandler.pushStatus();

        assertThat(emitters(queueSseHandler)).doesNotContainKey(queueToken);
    }

    @Test
    @DisplayName("내부 종료 정리 로직은 사용자를 leave 처리한다")
    void leaveAndRemove_callsLeave() {
        String queueToken = "queue-token";
        QueueStatusService queueStatusService = mock(QueueStatusService.class);
        QueueSseHandler queueSseHandler = new QueueSseHandler(queueStatusService);

        when(queueStatusService.getStatusByQueueToken(queueToken))
                .thenReturn(QueueStatusResponse.waiting(
                        queueToken,
                        1L,
                        1L,
                        0L,
                        Instant.now()
                ));

        SseEmitter emitter = queueSseHandler.connect(queueToken);
        ReflectionTestUtils.invokeMethod(queueSseHandler, "leaveAndRemove", queueToken, emitter);

        verify(queueStatusService, times(1)).leave(queueToken);
        assertThat(emitters(queueSseHandler)).doesNotContainKey(queueToken);
    }

    @SuppressWarnings("unchecked")
    private Map<String, SseEmitter> emitters(QueueSseHandler queueSseHandler) {
        return (Map<String, SseEmitter>) ReflectionTestUtils.getField(queueSseHandler, "emitters");
    }
}
