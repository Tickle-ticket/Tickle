package com.tickle.ingest.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;

import java.util.Map;

public record BehaviorEventRequest(
        @NotBlank
        String type,

        @JsonAlias("schedule_id")
        Long scheduleId,

        @JsonAlias("event_id")
        Long eventId,

        @JsonAlias("event_date")
        String eventDate,

        @NotBlank
        String createdAt,

        @NotNull
        @NotEmpty(message = "features empty")
        Map<String, Object> features
) {
    public BehaviorEventRequest {
        if (type != null) {
            type = type.toUpperCase();
        }
    }
}
