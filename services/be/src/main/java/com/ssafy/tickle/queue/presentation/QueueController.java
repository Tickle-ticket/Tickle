package com.ssafy.tickle.queue.presentation;

import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.queue.application.QueueService;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterRequest;
import com.ssafy.tickle.queue.presentation.dto.QueueEnterResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 대기열 진입 관련 API를 제공합니다.
 */
@RestController
@RequestMapping("/api/v1/queue")
@RequiredArgsConstructor
public class QueueController implements QueueApiDoc {

    private final QueueService queueService;

    /**
     * 사용자의 대기열 진입 등록 요청을 접수합니다.
     *
     * @param request 대기열 진입 요청
     * @return 접수된 요청 정보
     */
    @PostMapping("/enter")
    @Override
    public ResponseEntity<BaseResponse<QueueEnterResponse>> enter(@Valid @RequestBody QueueEnterRequest request) {
        QueueEnterResponse response = queueService.enter(request);

        return ResponseEntity
                .status(SuccessCode.CREATED.getStatus())
                .body(BaseResponse.success(SuccessCode.CREATED, response));
    }
}
