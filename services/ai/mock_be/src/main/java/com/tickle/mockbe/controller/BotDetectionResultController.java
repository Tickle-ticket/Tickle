package com.tickle.mockbe.controller;

import com.tickle.mockbe.dto.ApiResponse;
import com.tickle.mockbe.dto.BotDetectionResultRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/ai/v1/bot-detection")
public class BotDetectionResultController {

    @PostMapping("/result")
    public ResponseEntity<ApiResponse<Void>> receiveResult(
            @RequestHeader("access-token") String accessToken,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestHeader(value = "X-Request-Id", required = false) String requestId,
            @Valid @RequestBody BotDetectionResultRequest request
    ) {
        System.out.println("========== Mock BE received bot detection result ==========");
        System.out.println("access-token: " + accessToken);
        System.out.println("Authorization: " + authorization);
        System.out.println("X-Request-Id: " + requestId);
        System.out.println("body: " + request);
        System.out.println("===========================================================");

        if (!request.result().equalsIgnoreCase("allow") && !request.result().equalsIgnoreCase("block")) {
            ApiResponse<Void> response = new ApiResponse<>(
                    HttpStatus.BAD_REQUEST.value(),
                    "result는 allow 또는 block 중 하나여야 합니다.",
                    null
            );

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(response);
        }

        ApiResponse<Void> response = new ApiResponse<>(
                HttpStatus.OK.value(),
                "AI 추론 결과를 정상적으로 수신했습니다.",
                null
        );

        return ResponseEntity.ok(response);
    }
}
