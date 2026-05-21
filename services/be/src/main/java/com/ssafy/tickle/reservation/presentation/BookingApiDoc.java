package com.ssafy.tickle.reservation.presentation;

import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.reservation.presentation.dto.BookingOptionsRequest;
import com.ssafy.tickle.reservation.presentation.dto.BookingOptionsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;

/**
 * 예매 API Swagger 문서 인터페이스입니다.
 */
@Tag(name = "Booking", description = "예매 API")
public interface BookingApiDoc {

    @Operation(
            summary = "권종 선택 옵션 조회",
            description = """
                    좌석 hold 이후, 결제 이전 단계에서 좌석별 선택 가능한 권종/할인 옵션을 조회합니다.

                    - 좌석 선점 단계에서 이미 대기열 검증이 끝났다고 보고, 여기서는 admitToken을 다시 요구하지 않습니다.
                    - Redis hold와 DB HELD 상태를 함께 검증합니다.
                    - 좌석별 EventPricePolicy와 priceInfos를 반환합니다.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "권종 선택 옵션 조회 성공"),
            @ApiResponse(responseCode = "400", description = "요청값 불일치 또는 session/user 검증 실패"),
            @ApiResponse(responseCode = "404", description = "공연/회차/좌석/대기열 토큰을 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "좌석 hold가 유효하지 않음")
    })
    ResponseEntity<BaseResponse<BookingOptionsResponse>> getBookingOptions(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1") @UserId Long userId,
            @Valid @RequestBody BookingOptionsRequest request
    );
}
