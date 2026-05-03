package com.tickle.ingest.controller;

import com.tickle.ingest.dto.BehaviorEventRequest;
import com.tickle.ingest.dto.IngestAcceptedResponse;
import com.tickle.ingest.producer.BehaviorEventProducer;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/behavior")
public class BehaviorEventController {

    private final BehaviorEventProducer behaviorEventProducer;

    public BehaviorEventController(BehaviorEventProducer behaviorEventProducer) {
        this.behaviorEventProducer = behaviorEventProducer;
    }

    @PostMapping("/events")
    public ResponseEntity<IngestAcceptedResponse> ingestBehaviorEvent(
            @Valid @RequestBody BehaviorEventRequest request
    ) {
        behaviorEventProducer.send(request);

        IngestAcceptedResponse response = new IngestAcceptedResponse(
                true,
                behaviorEventProducer.topic()
        );

        return ResponseEntity
                .status(HttpStatus.ACCEPTED)
                .body(response);
    }
}