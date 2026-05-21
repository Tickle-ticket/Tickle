package com.ssafy.tickle.reservation.presentation;

import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.reservation.presentation.dto.BookingPreorderRequest;
import com.ssafy.tickle.reservation.presentation.dto.BookingPreorderResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;

/**
 * 권종과 좌석 선택을 확정해 예매 초안을 만드는 API 문서 인터페이스입니다.
 */
@Tag(name = "Booking", description = "예매 API")
public interface BookingPreorderApiDoc {

    @Operation(
            summary = "권종 선택 확정",
            description = """
                    좌석 hold 이후 사용자가 고른 권종/할인을 확정하고 예매 초안을 생성합니다.

                    - Redis hold와 DB HELD 상태를 검증합니다.
                    - 좌석별 선택한 discountName은 필수입니다.
                    - discountName은 해당 좌석의 priceInfos에 포함된 값만 허용합니다.
                    - 선택한 priceInfo의 ticketPriceAmount를 티켓 가격으로 사용합니다.
                    - 성공 시 bookingId를 반환하며, 이후 결제 단계는 bookingId를 기준으로 진행합니다.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "예매 초안 생성 성공"),
            @ApiResponse(responseCode = "400", description = "유효하지 않은 권종 선택"),
            @ApiResponse(responseCode = "404", description = "공연/회차/사용자를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "좌석 hold가 유효하지 않음")
    })
    ResponseEntity<BaseResponse<BookingPreorderResponse>> preorder(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1") @UserId Long userId,
            @Valid @RequestBody BookingPreorderRequest request
    );

}
