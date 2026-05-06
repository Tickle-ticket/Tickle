package com.tickle.mockbe.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record BotDetectionResultRequest(
        @NotBlank
        String result,

        @NotBlank
        String type,

        @JsonAlias("scheduleId")
        @JsonProperty("schedule_id")
        String scheduleId,

        @JsonAlias("eventId")
        @JsonProperty("event_id")
        String eventId,

        @JsonAlias("eventDate")
        @JsonProperty("event_date")
        String eventDate,

        @JsonAlias("pMacro")
        @JsonProperty("p_macro")
        @NotNull
        @DecimalMin("0.0")
        @DecimalMax("1.0")
        Double pMacro,

        String description,

        @NotBlank
        String createdAt
) {
}
