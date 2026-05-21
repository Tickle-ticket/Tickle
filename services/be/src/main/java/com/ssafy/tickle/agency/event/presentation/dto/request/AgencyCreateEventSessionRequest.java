package com.ssafy.tickle.agency.event.presentation.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;

/**
 * 공연 회차 생성 요청입니다.
 *
 * @param startAt 시작 시각
 * @param endAt 종료 시각
 * @param salesOpenAt 예매 시작 시각
 * @param salesCloseAt 예매 종료 시각
 */
public record AgencyCreateEventSessionRequest(
        @NotNull(message = "startAt은 필수입니다.")
        Instant startAt,

        @NotNull(message = "endAt은 필수입니다.")
        Instant endAt,

        @NotNull(message = "salesOpenAt은 필수입니다.")
        Instant salesOpenAt,

        @NotNull(message = "salesCloseAt은 필수입니다.")
        Instant salesCloseAt
) {
}
