package com.ssafy.tickle.reservation.presentation;

import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.reservation.application.BookingOptionService;
import com.ssafy.tickle.reservation.presentation.dto.BookingOptionsRequest;
import com.ssafy.tickle.reservation.presentation.dto.BookingOptionsResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 예매 API를 제공하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Booking", description = "예매 API")
public class BookingController implements BookingApiDoc {

    private final BookingOptionService bookingOptionService;

    @Override
    @PostMapping("/bookings/options")
    public ResponseEntity<BaseResponse<BookingOptionsResponse>> getBookingOptions(
            @UserId Long userId,
            @Valid @RequestBody BookingOptionsRequest request
    ) {
        return ResponseEntity.ok(
                BaseResponse.success(SuccessCode.OK, bookingOptionService.getBookingOptions(userId, request))
        );
    }
}
