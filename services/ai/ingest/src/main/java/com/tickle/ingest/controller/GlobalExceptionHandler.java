package com.tickle.ingest.controller;

import com.tickle.ingest.dto.IngestAcceptedResponse;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
    public ResponseEntity<IngestAcceptedResponse> handleValidationExceptions(Exception ex) {
        String message = "bad request";

        if (ex instanceof MethodArgumentNotValidException manv && manv.getBindingResult().hasErrors()) {
            message = manv.getBindingResult().getAllErrors().get(0).getDefaultMessage();
        } else if (ex instanceof BindException be && be.getBindingResult().hasErrors()) {
            message = be.getBindingResult().getAllErrors().get(0).getDefaultMessage();
        }

        return errorResponse(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<IngestAcceptedResponse> handleConstraintViolation(ConstraintViolationException ex) {
        String message = ex.getConstraintViolations()
                .stream()
                .findFirst()
                .map(v -> v.getMessage())
                .orElse("bad request");

        return errorResponse(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<IngestAcceptedResponse> handleIllegalArgument(IllegalArgumentException ex) {
        return errorResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    private static ResponseEntity<IngestAcceptedResponse> errorResponse(HttpStatus status, String message) {
        IngestAcceptedResponse response = new IngestAcceptedResponse(
                status.value(),
                message,
                null
        );

        return ResponseEntity.status(status).body(response);
    }
}

