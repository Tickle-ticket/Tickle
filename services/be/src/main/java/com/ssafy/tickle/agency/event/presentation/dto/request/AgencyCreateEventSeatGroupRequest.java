package com.ssafy.tickle.agency.event.presentation.dto.request;

import com.ssafy.tickle.common.domain.SeatGrade;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * 공연장 좌석을 가격 정책 단위로 묶어 전달하는 요청입니다.
 *
 * @param priceGrade 가격 등급
 * @param seatIds 해당 가격 정책에 매핑할 공연장 좌석 식별자 목록
 */
public record AgencyCreateEventSeatGroupRequest(
        @NotNull(message = "priceGrade는 필수입니다.")
        SeatGrade priceGrade,

        @NotEmpty(message = "seatIds는 하나 이상 필요합니다.")
        List<@NotNull Long> seatIds
) {
}
