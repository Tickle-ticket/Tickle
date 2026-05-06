package com.ssafy.tickle.cancellation.presentation.dto;

import com.ssafy.tickle.cancellation.domain.CancellationOffer;
import com.ssafy.tickle.seat.domain.SessionSeat;

import java.math.BigDecimal;
import java.time.Instant;

public record CancellationOfferDetailResponse(
        Long offerId,
        Long sessionId,
        Long seatId,
        String section,
        String row,
        String number,
        BigDecimal totalPaymentAmount,
        Instant offerExpiresAt
) {
    public static CancellationOfferDetailResponse from(CancellationOffer offer, BigDecimal totalPaymentAmount) {
        SessionSeat seat = offer.getCancellationCandidate().getSessionSeat();
        return new CancellationOfferDetailResponse(
                offer.getId(),
                seat.getSession().getId(),
                seat.getId(),
                seat.getEventSeat().getEventSection().getSectionName(),
                seat.getEventSeat().getRowLabel(),
                seat.getEventSeat().getSeatNumber(),
                totalPaymentAmount,
                offer.getOfferExpiresAt()
        );
    }
}
