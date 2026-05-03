package com.tickle.ingest.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;

import java.util.Map;

public record BehaviorEventRequest(
        @JsonProperty("access_token")
        String accessToken,

        @NotBlank
        String type,

        @JsonProperty("schedule_id")
        @NotBlank
        String scheduleId,

        @NotBlank
        String name,

        @JsonProperty("event_date")
        @NotBlank
        String eventDate,

        @NotBlank
        String createdAt,

        @NotNull
        @NotEmpty
        Map<String, Object> features
) {
}