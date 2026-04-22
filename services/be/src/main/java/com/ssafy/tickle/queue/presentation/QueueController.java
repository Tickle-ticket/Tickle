package com.ssafy.tickle.queue.presentation;

import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.queue.application.QueueEnterService;
import com.ssafy.tickle.queue.application.QueueStatusService;
import com.ssafy.tickle.queue.application.QueueStreamService;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterRequest;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterResponse;
import com.ssafy.tickle.queue.presentation.dto.QueueStatusResponse;
import com.ssafy.tickle.queue.presentation.dto.QueueTokenResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 대기열 진입 관련 API를 제공합니다.
 */
@RestController
@RequestMapping("/api/v1/queue")
@RequiredArgsConstructor
public class QueueController implements QueueApiDoc {

    private final QueueEnterService queueEnterService;
    private final QueueStatusService queueStatusService;
    private final QueueStreamService queueStreamService;

    /**
     * 사용자의 대기열 진입 등록 요청을 접수합니다.
     *
     * @param request 대기열 진입 요청
     * @return 접수된 요청 정보
     */
    @PostMapping("/enter")
    @Override
    public ResponseEntity<BaseResponse<QueueEnterResponse>> enter(@Valid @RequestBody QueueEnterRequest request) {
        QueueEnterResponse response = queueEnterService.enter(request);

        return ResponseEntity
                .status(SuccessCode.CREATED.getStatus())
                .body(BaseResponse.success(SuccessCode.CREATED, response));
    }

    /**
     * requestId 기반으로 최초 queueToken을 발급합니다.
     *
     * @param requestId 대기열 진입 요청 식별자
     * @return queueToken과 현재 상태
     */
    @GetMapping("/token")
    @Override
    public ResponseEntity<BaseResponse<QueueTokenResponse>> getToken(@RequestParam String requestId) {
        QueueTokenResponse response = queueStatusService.getQueueToken(requestId);

        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK, response));
    }

    /**
     * queueToken 기준 현재 대기 상태를 조회합니다.
     *
     * @param queueToken 대기열 토큰
     * @return 현재 대기 상태
     */
    @GetMapping("/status")
    @Override
    public ResponseEntity<BaseResponse<QueueStatusResponse>> getStatus(@RequestParam String queueToken) {
        QueueStatusResponse response = queueStatusService.getStatusByQueueToken(queueToken);

        return ResponseEntity
                .ok()
                .body(BaseResponse.success(SuccessCode.OK, response));
    }

    /**
     * queueToken 기준 실시간 대기 상태를 SSE로 구독합니다.
     *
     * @param queueToken 대기열 토큰
     * @return SSE emitter
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Override
    public SseEmitter stream(@RequestParam String queueToken) {
        return queueStreamService.connect(queueToken);
    }
}
