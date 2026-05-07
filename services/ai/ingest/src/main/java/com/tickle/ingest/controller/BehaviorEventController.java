package com.tickle.ingest.controller;

import com.tickle.ingest.dto.BehaviorEventRequest;
import com.tickle.ingest.dto.IngestAcceptedResponse;
import com.tickle.ingest.producer.BehaviorEventProducer;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@Validated
@RestController
@RequestMapping("/api/behavior")
public class BehaviorEventController {

    private final BehaviorEventProducer behaviorEventProducer;
    private final String expectedInternalSecret;

    public BehaviorEventController(BehaviorEventProducer behaviorEventProducer) {
        this.behaviorEventProducer = behaviorEventProducer;
        this.expectedInternalSecret = System.getenv().getOrDefault("INGEST_INTERNAL_SECRET", "tickle-internal");
    }

    @PostMapping("/events")
    public ResponseEntity<IngestAcceptedResponse> ingestBehaviorEvent(
            @RequestHeader("access-token") @NotBlank String accessToken,
            @RequestHeader(value = "X-Internal-Secret", required = false) String internalSecret,
            @RequestHeader(value = "X-Request-Id", required = false) String requestId,
            @Valid @RequestBody BehaviorEventRequest request
    ) {
        if (!expectedInternalSecret.isBlank()) {
            if (internalSecret == null || internalSecret.isBlank()) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "missing internal secret");
            }

            if (!expectedInternalSecret.equals(internalSecret)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid internal secret");
            }
        }

        behaviorEventProducer.send(request, accessToken, internalSecret, requestId);

        IngestAcceptedResponse response = new IngestAcceptedResponse(
                HttpStatus.ACCEPTED.value(),
                "accepted",
                null
        );

        return ResponseEntity
                .status(HttpStatus.ACCEPTED)
                .body(response);
    }
}
