package com.ssafy.tickle.agency.event.application.dto;

import com.ssafy.tickle.common.domain.SeatGrade;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.venue.domain.VenueSeat;

import java.time.Instant;

/**
 * 공연 좌석 batch insert에 필요한 값만 담는 명령입니다.
 *
 * @param eventSectionId 공연 구역 식별자
 * @param eventPricePolicyId 공연 가격 정책 식별자
 * @param venueId 공연장 식별자
 * @param rowLabel 열 라벨
 * @param seatNumber 좌석 번호
 * @param seatLabel 좌석 표기
 * @param seatGrade 좌석 등급
 * @param createdAt 생성 시각
 * @param updatedAt 수정 시각
 */
public record EventSeatInsertCommand(
        Long eventSectionId,
        Long eventPricePolicyId,
        Long venueId,
        String rowLabel,
        String seatNumber,
        String seatLabel,
        SeatGrade seatGrade,
        Instant createdAt,
        Instant updatedAt
) {

    /**
     * 공연장 좌석과 가격 정책으로부터 공연 좌석 생성 명령을 만듭니다.
     */
    public static EventSeatInsertCommand from(
            Long eventSectionId,
            EventPricePolicy pricePolicy,
            Long venueId,
            VenueSeat venueSeat
    ) {
        SeatGrade seatGrade = pricePolicy.getPriceGrade();
        if (!seatGrade.equals(venueSeat.getSeatGrade())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "공연장 좌석 등급과 가격 정책 등급이 일치해야 합니다.");
        }
        Instant now = Instant.now();
        return new EventSeatInsertCommand(
                eventSectionId,
                pricePolicy.getId(),
                venueId,
                venueSeat.getRowLabel(),
                venueSeat.getSeatNumber(),
                venueSeat.getSeatLabel(),
                seatGrade,
                now,
                now
        );
    }
}
