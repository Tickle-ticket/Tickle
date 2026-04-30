package com.ssafy.tickle.reservation.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.reservation.application.ReservationService;
import com.ssafy.tickle.reservation.presentation.dto.ReservationDetailResponse;
import com.ssafy.tickle.reservation.presentation.dto.ReservationListResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 예매 API를 제공하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1/reservations")
@RequiredArgsConstructor
public class ReservationController implements ReservationApiDoc {

    private final ReservationService reservationService;

    /**
     * 사용자의 예매 내역 목록을 조회합니다.
     *
     * @param userId 사용자 식별자
     * @return 예매 요약 목록
     */
    @Override
    @GetMapping
    public ResponseEntity<BaseResponse<ReservationListResponse>> getReservationList(
            @RequestParam Long userId
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(reservationService.getReservationList(userId)));
    }

    /**
     * 특정 예매의 상세 정보를 조회합니다.
     *
     * @param reservationId 예매 식별자
     * @param userId        사용자 식별자
     * @return 예매 상세 응답
     */
    @Override
    @GetMapping("/{reservationId}")
    public ResponseEntity<BaseResponse<ReservationDetailResponse>> getReservationDetail(
            @PathVariable Long reservationId,
            @RequestParam Long userId
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(reservationService.getReservationDetail(reservationId, userId)));
    }

    /**
     * 예매를 취소합니다.
     *
     * @param reservationId 예매 식별자
     * @param userId        사용자 식별자
     * @return 빈 응답
     */
    @Override
    @DeleteMapping("/{reservationId}")
    public ResponseEntity<BaseResponse<Void>> cancelReservation(
            @PathVariable Long reservationId,
            @RequestParam Long userId
    ) {
        reservationService.cancelReservation(reservationId, userId);
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(null));
    }
}
