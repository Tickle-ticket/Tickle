package com.tickle.ingest.dto;

public record IngestAcceptedResponse(
        int status,
        String message,
        Object data
) {
}