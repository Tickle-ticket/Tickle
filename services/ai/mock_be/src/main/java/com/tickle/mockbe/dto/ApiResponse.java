package com.tickle.mockbe.dto;

public record ApiResponse<T>(
        int status,
        String message,
        T data
) {
}