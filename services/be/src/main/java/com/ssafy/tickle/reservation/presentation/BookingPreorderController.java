package com.ssafy.tickle.reservation.presentation;

import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.reservation.application.BookingPreorderService;
import com.ssafy.tickle.reservation.presentation.dto.BookingMockPreorderResponse;
import com.ssafy.tickle.reservation.presentation.dto.BookingPreorderRequest;
import com.ssafy.tickle.reservation.presentation.dto.BookingPreorderResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 예매 초안 API를 제공하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Booking", description = "예매 API")
public class BookingPreorderController implements BookingPreorderApiDoc {

    private final BookingPreorderService bookingPreorderService;

    @Override
    @PostMapping("/bookings/preorder")
    public ResponseEntity<BaseResponse<BookingPreorderResponse>> preorder(
            @UserId Long userId,
            @Valid @RequestBody BookingPreorderRequest request
    ) {
        return ResponseEntity.ok(
                BaseResponse.success(SuccessCode.OK, bookingPreorderService.preorder(userId, request))
        );
    }

    @Override
    @PostMapping("/bookings/preorder/mock")
    public ResponseEntity<BaseResponse<BookingMockPreorderResponse>> mockPreorder(
            @UserId Long userId,
            @Valid @RequestBody BookingPreorderRequest request
    ) {
        return ResponseEntity.ok(
                BaseResponse.success(SuccessCode.OK, bookingPreorderService.mockPreorder(userId, request))
        );
    }
}
